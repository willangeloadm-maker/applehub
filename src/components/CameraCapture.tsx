import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, Check, RotateCcw, Upload, Loader2 } from 'lucide-react';
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
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Timeout para caso a câmera não carregue
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
    }, 10000); // 10 segundos de timeout

    return () => clearTimeout(timeout);
  }, [showCamera, cameraReady, toast]);

  // Configurações da webcam baseadas no tipo
  const videoConstraints = {
    facingMode: guideType === 'selfie' ? 'user' : 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  };

  const compressImage = async (canvas: HTMLCanvasElement): Promise<{ blob: Blob; quality: number }> => {
    const MAX_WIDTH = 1920;
    const MAX_HEIGHT = 1920;
    const TARGET_SIZE_KB = 500;

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

    let quality = 0.9;
    let blob: Blob | null = null;

    while (quality > 0.5) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      });

      if (!blob) break;

      const sizeKB = blob.size / 1024;
      if (sizeKB <= TARGET_SIZE_KB || quality <= 0.5) {
        break;
      }

      quality -= 0.1;
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
      // Converter base64 para blob
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
  }, [webcamRef, onCapture, label, toast]);

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

    // Para PDFs, criar o File diretamente
    if (file.type === 'application/pdf') {
      onCapture(file);
      setPreview('pdf');
      return;
    }

    // Para imagens, processar e validar
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
      <Card className="p-4 bg-muted/30">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              {label}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={retake}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          {preview === 'pdf' ? (
            <div className="w-full h-40 rounded-lg bg-muted flex items-center justify-center">
              <p className="text-sm text-muted-foreground">PDF carregado</p>
            </div>
          ) : (
            <img src={preview} alt={label} className="w-full rounded-lg" />
          )}
        </div>
      </Card>
    );
  }

  // Interface da câmera
  if (showCamera) {
    return (
      <Card className="p-4 bg-black">
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden">
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                <p className="text-white text-sm">Iniciando câmera...</p>
                <p className="text-white/60 text-xs mt-2">Aguarde alguns segundos</p>
              </div>
            )}
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full rounded-lg"
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
            
            {/* Guia visual - só mostra quando a câmera está pronta */}
            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {guideType === 'document' && (
                  <div className="w-[85%] h-[60%] border-4 border-white/70 rounded-lg shadow-lg">
                    <div className="absolute top-2 left-2 right-2 text-center">
                      <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
                        Posicione o documento dentro do quadro
                      </span>
                    </div>
                  </div>
                )}
                {guideType === 'selfie' && (
                  <div className="relative">
                    <div className="w-64 h-80 border-4 border-white/70 rounded-full">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-center">
                        <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded whitespace-nowrap">
                          Posicione seu rosto no círculo
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setShowCamera(false);
                setCameraReady(false);
              }}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={!cameraReady}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capturar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Tela inicial de seleção
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Card className={cn(
        "p-6 border-2 border-dashed transition-colors",
        "bg-muted/30"
      )}>
        <div className="w-full flex flex-col items-center gap-3">
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Camera className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-center">Usar câmera</p>
            </button>
            <button
              type="button"
              onClick={triggerFileUpload}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-center">Escolher arquivo</p>
            </button>
          </div>
          <div className="text-center">
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {guideType === 'selfie' ? 'Tire uma selfie ou escolha uma foto' : 'Fotografe ou escolha o documento (foto ou PDF)'}
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
