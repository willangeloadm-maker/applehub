import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  label: string;
  guideType: 'document' | 'selfie';
  captured?: File | null;
}

export default function CameraCapture({ onCapture, label, guideType, captured }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (captured) {
      const url = URL.createObjectURL(captured);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [captured]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: guideType === 'selfie' ? 'user' : 'environment' },
        audio: false
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `${label}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      setPreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const retake = () => {
    setPreview(null);
    startCamera();
  };

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
          <img src={preview} alt={label} className="w-full rounded-lg" />
        </div>
      </Card>
    );
  }

  if (showCamera) {
    return (
      <Card className="p-4 bg-black">
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg"
          />
          
          {/* Guia visual */}
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

          <canvas ref={canvasRef} className="hidden" />
          
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={stopCamera}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={capturePhoto}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capturar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors",
      "bg-muted/30"
    )}>
      <button
        type="button"
        onClick={startCamera}
        className="w-full flex flex-col items-center gap-3"
      >
        <Camera className="w-8 h-8 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique para {guideType === 'selfie' ? 'tirar selfie' : 'fotografar documento'}
          </p>
        </div>
      </button>
    </Card>
  );
}
