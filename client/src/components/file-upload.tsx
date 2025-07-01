import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, File, Download, Trash2, Image, FileText, Archive } from "lucide-react";
import type { AttachmentWithUser } from "@shared/schema";

interface FileUploadProps {
  findingId: number;
}

export function FileUpload({ findingId }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['/api/findings', findingId, 'attachments'],
    queryFn: async () => {
      const response = await fetch(`/api/findings/${findingId}/attachments`);
      if (!response.ok) throw new Error('Failed to fetch attachments');
      return response.json() as Promise<AttachmentWithUser[]>;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/findings/${findingId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/findings', findingId, 'attachments'] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await apiRequest('DELETE', `/api/attachments/${attachmentId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/findings', findingId, 'attachments'] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }
    
    // Check file type
    const allowedTypes = /\.(jpg|jpeg|png|gif|pdf|doc|docx|txt|zip|rar)$/i;
    if (!allowedTypes.test(file.name)) {
      toast({
        title: "Invalid file type",
        description: "Only images, documents, and archive files are allowed",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="w-4 h-4" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const handleDownload = (attachmentId: number, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/attachments/${attachmentId}/download`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Attachments & Evidence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? 'border-[hsl(var(--accent-green))] bg-[hsl(var(--accent-green))]/10'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Drag and drop files here, or{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-[hsl(var(--accent-green))]"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              browse
            </Button>
          </p>
          <p className="text-xs text-gray-500">
            Supports: Images, PDFs, Documents, Archives (Max: 10MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={uploadMutation.isPending}
          />
        </div>

        {uploadMutation.isPending && (
          <div className="text-center py-2">
            <div className="inline-flex items-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[hsl(var(--accent-green))] mr-2"></div>
              Uploading...
            </div>
          </div>
        )}

        {/* Attachments List */}
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--accent-green))] mx-auto"></div>
          </div>
        ) : attachments.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Files ({attachments.length})</h4>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(attachment.mimeType)}
                  <div>
                    <p className="text-sm font-medium">{attachment.originalName}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      <span>•</span>
                      <span>
                        Uploaded by {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(attachment.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(attachment.id, attachment.originalName)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(attachment.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No attachments yet. Upload screenshots and evidence files to document this finding.
          </div>
        )}
      </CardContent>
    </Card>
  );
}