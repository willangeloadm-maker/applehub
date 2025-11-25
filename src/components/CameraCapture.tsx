import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, Check, RotateCcw, Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  label: string;
  guideType: 'document' | 'selfie';
  captured?: File | null;
}

export default function CameraCapture({ onCapture, label, guideType, captured }: CameraCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sincronizar preview com captured prop
  useEffect(() => {
    if (captured && !preview) {
      if (captured.type === 'application/pdf') {
        setPreview('pdf');
      } else {
        // Criar preview do arquivo capturado
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(captured);
      }
    }
  }, [captured]);
  const compressImage = async (canvas: HTMLCanvasElement): Promise<{ blob: Blob; quality: number }> => {
    const MAX_WIDTH = 2560;
    const MAX_HEIGHT = 2560;
    const TARGET_SIZE_KB = 800;

    let width = canvas.width;
    let height = canvas.height;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      if (width > height) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      } else {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }

      const resizeCanvas = document.createElement('canvas');
      resizeCanvas.width = width;
      resizeCanvas.height = height;
      const resizeCtx = resizeCanvas.getContext('2d');
      if (resizeCtx) {
        resizeCtx.drawImage(canvas, 0, 0, width, height);
        canvas = resizeCanvas;
      }
    }

    let quality = 0.95;
    let blob: Blob | null = null;

    while (quality > 0.7) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      });

      if (!blob) break;

      const sizeKB = blob.size / 1024;
      if (sizeKB <= TARGET_SIZE_KB || quality <= 0.7) {
        break;
      }

      quality -= 0.05;
    }

    return { blob: blob!, quality };
  };

  const retake = () => {
    setPreview(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG) ou PDF",
        variant: "destructive",
      });
      return;
    }

    if (file.type === 'application/pdf') {
      onCapture(file);
      setPreview('pdf');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          toast({
            title: "Erro",
            description: "Não foi possível processar a imagem",
            variant: "destructive",
          });
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        const { blob } = await compressImage(canvas);
        if (!blob) {
          toast({
            title: "Erro",
            description: "Erro ao processar imagem",
            variant: "destructive",
          });
          return;
        }

        const processedFile = new File([blob], file.name, { type: 'image/jpeg' });
        onCapture(processedFile);
        setPreview(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Preview da foto capturada
  if (preview) {
    return (
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-muted/50 to-background backdrop-blur-sm shadow-xl animate-scale-in">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse-glow">
                <Check className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">{label}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={retake}
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refazer
            </Button>
          </div>
          {preview === 'pdf' ? (
            <div className="w-full h-48 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex flex-col items-center justify-center border-2 border-dashed border-primary/30">
              <FileText className="w-12 h-12 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">PDF carregado com sucesso</p>
              <p className="text-xs text-muted-foreground mt-1">Documento pronto para análise</p>
            </div>
          ) : (
            <div className="relative group">
              <img 
                src={preview} 
                alt={label} 
                className="w-full rounded-xl shadow-lg border-2 border-primary/20 transition-transform group-hover:scale-[1.02]" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Tela inicial de seleção modernizada
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Card className="overflow-hidden border-2 border-dashed border-primary/30 bg-gradient-to-br from-muted/30 to-background hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10 animate-fade-in-up">
        <div className="p-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-primary/30 animate-bounce-subtle">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{label}</h3>
              <p className="text-sm text-muted-foreground">Escolha como enviar sua foto</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                type="button"
                onClick={() => {
                  // Cria um input temporário com capture para abrir a câmera nativa
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,application/pdf';
                  // Para selfie usa câmera frontal, para documento usa traseira
                  input.capture = guideType === 'selfie' ? 'user' : 'environment';
                  input.onchange = (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    const file = target.files?.[0];
                    if (file) {
                      handleFileUpload({ target: { files: [file] } } as any);
                    }
                  };
                  input.click();
                }}
                variant="default"
                className="flex-1 h-12 bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] text-white shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105"
              >
                <Camera className="w-5 h-5 mr-2" />
                Tirar Foto
              </Button>
              <Button
                type="button"
                onClick={triggerFileUpload}
                variant="outline"
                className="flex-1 h-12 border-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all hover:scale-105"
              >
                <Upload className="w-5 h-5 mr-2" />
                Enviar da Galeria
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
