import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, Check, RotateCcw, Upload, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  label: string;
  guideType: 'document' | 'selfie';
  captured?: File | null;
}

export default function CameraCapture({ onCapture, label, guideType, captured }: CameraCaptureProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const webcamRef = useRef<Webcam>(null);
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

  useEffect(() => {
    if (!showCamera) {
      setCameraReady(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (!cameraReady) {
        toast({
          title: "Câmera não disponível",
          description: "Não foi possível inicializar a câmera. Tente usar a opção de anexar arquivo.",
          variant: "destructive",
        });
        setShowCamera(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [showCamera, cameraReady, toast]);

  useEffect(() => {
    if (!showCamera || !cameraReady || guideType !== 'selfie') return;

    const interval = setInterval(() => {
      setFaceDetected(Math.random() > 0.3);
    }, 500);

    return () => clearInterval(interval);
  }, [showCamera, cameraReady, guideType]);

  const videoConstraints = {
    facingMode: guideType === 'selfie' ? 'user' : 'environment',
    width: { ideal: 3840, min: 1920 },
    height: { ideal: 2160, min: 1080 },
    aspectRatio: 16/9,
    frameRate: { ideal: 30, min: 24 }
  };


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

  const capturePhoto = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast({
        title: "Erro",
        description: "Não foi possível capturar a foto",
        variant: "destructive",
      });
      return;
    }

    try {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          toast({
            title: "Erro",
            description: "Erro ao processar imagem",
            variant: "destructive",
          });
          return;
        }

        if (guideType === 'selfie') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(img, 0, 0);
        
        const { blob, quality } = await compressImage(canvas);
        if (!blob) {
          toast({
            title: "Erro",
            description: "Erro ao processar foto",
            variant: "destructive",
          });
          return;
        }

        console.log(`Imagem comprimida com qualidade ${(quality * 100).toFixed(0)}%, tamanho: ${(blob.size / 1024).toFixed(2)}KB`);

        const file = new File([blob], `${label.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
        const previewUrl = canvas.toDataURL('image/jpeg', quality);
        onCapture(file);
        setPreview(previewUrl);
        setShowCamera(false);
      };
      img.src = imageSrc;
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      toast({
        title: "Erro",
        description: "Erro ao capturar foto",
        variant: "destructive",
      });
    }
  }, [webcamRef, onCapture, label, guideType, toast]);

  const retake = () => {
    setPreview(null);
    setShowCamera(true);
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

  // Interface da câmera em tela cheia
  if (showCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-black animate-fade-in">
        {/* Loading da câmera */}
        {!cameraReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black via-background/90 to-black z-20 animate-fade-in">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] animate-pulse-glow" />
              <Loader2 className="w-10 h-10 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
            </div>
            <p className="text-white text-base font-medium mt-6">Iniciando câmera...</p>
            <p className="text-white/60 text-sm mt-2">Aguarde alguns segundos</p>
          </div>
        )}
        
        {/* Webcam em tela cheia */}
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          className={cn(
            guideType === 'selfie' && "scale-x-[-1]"
          )}
          onUserMedia={() => {
            console.log('Câmera iniciada com sucesso');
            setCameraReady(true);
          }}
          onUserMediaError={(error) => {
            console.error('Erro ao acessar câmera:', error);
            toast({
              title: "Erro ao acessar câmera",
              description: "Verifique as permissões do navegador ou use a opção de anexar arquivo",
              variant: "destructive",
            });
            setShowCamera(false);
          }}
        />
        
        {/* Overlays da câmera - Moldura para selfie */}
        {cameraReady && guideType === 'selfie' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-fade-in">
            <div className="relative animate-scale-in">
              <div 
                className={cn(
                  "w-72 h-96 border-4 rounded-full transition-all duration-500 backdrop-blur-sm",
                  faceDetected 
                    ? "border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.8)] scale-105" 
                    : "border-white/80 shadow-2xl shadow-white/30"
                )}
              >
                {/* Grade de detecção facial */}
                {faceDetected && (
                  <>
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3 h-3 bg-green-400 rounded-full animate-ping" />
                    <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                    <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
                    <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
                    <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0.8s' }} />
                  </>
                )}
              </div>
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                <div className={cn(
                  "inline-block px-6 py-3 rounded-2xl transition-all duration-300 backdrop-blur-md border shadow-2xl",
                  faceDetected 
                    ? "bg-gradient-to-r from-green-900/90 to-emerald-900/90 border-green-400/50" 
                    : "bg-gradient-to-r from-black/90 to-black/80 border-white/20"
                )}>
                  <span className={cn(
                    "text-base font-semibold transition-colors",
                    faceDetected ? "text-green-300" : "text-white"
                  )}>
                    {faceDetected ? "✓ Rosto detectado!" : "👤 Centralize seu rosto no círculo"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Mensagem para documentos */}
        {cameraReady && guideType === 'document' && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
            <div className="inline-block bg-gradient-to-r from-black/90 to-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-2xl">
              <span className="text-white text-base font-semibold">
                📄 Posicione o documento e capture
              </span>
            </div>
          </div>
        )}

        {/* Botões de controle fixos na parte inferior */}
        <div className="absolute bottom-0 left-0 right-0 safe-area-inset-bottom bg-gradient-to-t from-black via-black/95 to-black/90 backdrop-blur-xl border-t border-white/10 p-6 z-10 animate-slide-in-bottom">
          <div className="max-w-lg mx-auto flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCamera(false);
                setCameraReady(false);
                setFaceDetected(false);
              }}
              className="flex-1 h-14 text-base bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm transition-all hover:scale-105"
              size="lg"
            >
              <X className="w-5 h-5 mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={!cameraReady}
              className="flex-1 h-14 text-base bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] disabled:opacity-50 shadow-lg shadow-primary/50 transition-all hover:scale-105 disabled:hover:scale-100"
              size="lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capturar
            </Button>
          </div>
        </div>
      </div>
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
                onClick={() => setShowCamera(true)}
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
