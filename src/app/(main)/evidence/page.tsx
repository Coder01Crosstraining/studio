"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import type { EvidenceDocument, SiteId, EvidenceCategory, Site } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const evidenceSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  category: z.enum(["reunion", "preventiva", "correctiva"], { required_error: "La categoría es obligatoria." }),
  file: z.any()
    .refine((files) => files?.length == 1, "Se requiere un archivo.")
    .refine((files) => files?.[0]?.size <= 5000000, `El tamaño máximo del archivo es 5MB.`)
    .refine(
      (files) => ["image/jpeg", "image/png", "application/pdf"].includes(files?.[0]?.type),
      "Solo se admiten formatos .jpg, .png y .pdf."
    ),
});

const categoryText: Record<EvidenceCategory, string> = {
  reunion: "Acta de Reunión",
  preventiva: "Acción Preventiva",
  correctiva: "Acción Correctiva",
};

const categoryColors: Record<EvidenceCategory, string> = {
  reunion: "bg-blue-400/20 text-blue-600 border-blue-400/30",
  preventiva: "bg-yellow-400/20 text-yellow-600 border-yellow-400/30",
  correctiva: "bg-orange-400/20 text-orange-600 border-orange-400/30",
};

export default function EvidencePage() {
  const { role, user } = useAuth();
  const [documents, setDocuments] = useState<EvidenceDocument[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SiteId | 'global'>(role === 'CEO' ? 'global' : user!.siteId!);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<EvidenceDocument | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof evidenceSchema>>({ resolver: zodResolver(evidenceSchema) });

  useEffect(() => {
    async function fetchInitialData() {
        if (!user) return;
        setIsFetching(true);
        
        try {
            // Fetch sites for CEO role
            if (role === 'CEO') {
                const sitesSnapshot = await getDocs(collection(db, 'sites'));
                setSites(sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site)));
            }
    
            const evidenceRef = collection(db, 'evidence');
            let q;
    
            if (role === 'CEO') {
                q = query(evidenceRef, orderBy('uploadedAt', 'desc'));
            } else {
                q = query(evidenceRef, where('siteId', '==', user.siteId), orderBy('uploadedAt', 'desc'));
            }

            const querySnapshot = await getDocs(q);
            const fetchedDocs = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id,
                    ...data,
                    uploadedAt: data.uploadedAt.toDate()
                } as EvidenceDocument;
            });
            setDocuments(fetchedDocs);
        } catch (error) {
            console.error("Error fetching documents: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los documentos.' });
        } finally {
            setIsFetching(false);
        }
    };

    fetchInitialData();
  }, [user, role, toast]);

  const siteMap = React.useMemo(() => new Map(sites.map(s => [s.id, s.name])), [sites]);

  async function onUploadSubmit(values: z.infer<typeof evidenceSchema>) {
    if (!user || !user.siteId) return;
    setIsLoading(true);
    
    try {
        const file = values.file[0];
        const storageRef = ref(storage, `evidence/${user.siteId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);

        const newDocData = {
            siteId: user.siteId,
            leaderId: user.uid,
            title: values.title,
            description: values.description,
            category: values.category,
            fileName: file.name,
            fileType: file.type.startsWith('image') ? 'image' : 'pdf',
            fileUrl,
            uploadedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'evidence'), newDocData);
        
        const newDocument = { ...newDocData, id: docRef.id, uploadedAt: new Date() } as EvidenceDocument;
        setDocuments(prev => [newDocument, ...prev]);

        toast({ title: 'Éxito', description: 'Tu documento ha sido subido correctamente.' });
        setIsFormOpen(false);
        form.reset();
    } catch (error) {
        console.error("Error uploading file: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo subir el archivo.' });
    } finally {
        setIsLoading(false);
    }
  }

  const filteredDocuments = documents.filter(p => {
    if (role === 'CEO') {
      if (selectedSite === 'global') return true;
      return p.siteId === selectedSite;
    }
    return p.siteId === user?.siteId;
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión Documental</h2>
          <p className="text-muted-foreground">
            {role === 'CEO' ? 'Revisa las evidencias de todas las sedes.' : 'Sube y gestiona las evidencias de tu sede.'}
          </p>
        </div>
        {role === 'SiteLeader' && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Subir Evidencia</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader><DialogTitle>Nueva Evidencia</DialogTitle><DialogDescription>Sube un documento o imagen como evidencia.</DialogDescription></DialogHeader>
              <Form {...form}><form onSubmit={form.handleSubmit(onUploadSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Elige una categoría" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="reunion">Acta de Reunión</SelectItem>
                          <SelectItem value="preventiva">Acción Preventiva</SelectItem>
                          <SelectItem value="correctiva">Acción Correctiva</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="file" render={({ field: { onChange, value, ...fieldProps } }) => (
                    <FormItem><FormLabel>Archivo (JPG, PNG, PDF)</FormLabel><FormControl><Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <DialogFooter><Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Subir Archivo</Button></DialogFooter>
              </form></Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {role === 'CEO' && (
        <div className="pb-4">
          <Select onValueChange={(value: any) => setSelectedSite(value)} defaultValue={selectedSite}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecciona una sede" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Todas las Sedes</SelectItem>
              {sites.map(site => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
        {isFetching ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader><TableRow>
                <TableHead>Título</TableHead>
                {role === 'CEO' && <TableHead>Sede</TableHead>}
                <TableHead>Categoría</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 && <TableRow><TableCell colSpan={role === 'CEO' ? 5: 4} className="h-24 text-center">No hay documentos.</TableCell></TableRow>}
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  {role === 'CEO' && <TableCell>{siteMap.get(doc.siteId) || doc.siteId}</TableCell>}
                  <TableCell><Badge className={cn("capitalize", categoryColors[doc.category])} variant="outline">{categoryText[doc.category]}</Badge></TableCell>
                  <TableCell>{format(doc.uploadedAt as Date, 'PPP', { locale: es })}</TableCell>
                  <TableCell className="text-right">
                    <Dialog onOpenChange={(open) => !open && setSelectedDocument(null)}>
                      <DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setSelectedDocument(doc)}><Eye className="h-4 w-4" /></Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader><DialogTitle>{selectedDocument?.title}</DialogTitle><DialogDescription>{selectedDocument && categoryText[selectedDocument.category]} - Subido el {selectedDocument && format(selectedDocument.uploadedAt as Date, 'PPP', { locale: es })}</DialogDescription></DialogHeader>
                        {selectedDocument && <div className="space-y-4 py-4 text-sm">
                          <div><p className="font-semibold">Descripción</p><p className="text-muted-foreground">{selectedDocument.description}</p></div>
                          <div><p className="font-semibold">Archivo</p><p className="text-muted-foreground"><a href={selectedDocument.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{selectedDocument.fileName}</a></p></div>
                          
                          <div className="font-semibold">Vista Previa</div>
                          <div className="rounded-md border p-4 h-64 flex items-center justify-center bg-muted/50">
                            {selectedDocument.fileType === 'image' ? (
                                <Image src={selectedDocument.fileUrl} alt={`Vista previa de ${selectedDocument.title}`} width={400} height={300} className="max-h-full w-auto object-contain" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <FileText className="mx-auto h-16 w-16" />
                                    <p className="mt-2">No hay vista previa disponible para archivos PDF.</p>
                                    <p><a href={selectedDocument.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Descargar archivo</a></p>
                                </div>
                            )}
                          </div>
                        </div>}
                        <DialogFooter><DialogClose asChild><Button>Cerrar</Button></DialogClose></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
