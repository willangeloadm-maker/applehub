import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Camera, X, Check, RotateCcw, Sun, Focus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type QualityLevel = 'good' | 'warning' | 'error';

interface QualityIndicators {
  brightness: { level: QualityLevel; value: number };
  sharpness: { level: QualityLevel; value: number };
}

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
  const [videoReady, setVideoReady] = useState(false);
  const [qualityIndicators, setQualityIndicators] = useState<QualityIndicators | null>(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qualityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoCaptureTimerRef = useRef<number>(0);
  const autoCaptureStartRef = useRef<number | null>(null);

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
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }
    };
  }, [stream]);

  useEffect(() => {
    if (videoReady && showCamera) {
      qualityCheckIntervalRef.current = setInterval(() => {
        checkQualityRealtime();
      }, 100); // Reduzido para 100ms para melhor responsividade do modo automático
    } else {
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
        qualityCheckIntervalRef.current = null;
      }
      setQualityIndicators(null);
      setAutoCaptureProgress(0);
      autoCaptureStartRef.current = null;
    }

    return () => {
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }
    };
  }, [videoReady, showCamera]);

  // Sistema de som
  const playBeep = (frequency: number, duration: number) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  const playCountdownBeep = () => {
    playBeep(800, 0.1);
  };

  const playCaptureSound = () => {
    // Som de clique da câmera (dois tons)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.frequency.value = 1200;
    oscillator2.frequency.value = 900;
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime + 0.05);
    oscillator1.stop(audioContext.currentTime + 0.15);
    oscillator2.stop(audioContext.currentTime + 0.2);
  };

  useEffect(() => {
    if (!autoCapture || !qualityIndicators) {
      setAutoCaptureProgress(0);
      autoCaptureStartRef.current = null;
      return;
    }

    const allGood = qualityIndicators.brightness.level === 'good' && 
                    qualityIndicators.sharpness.level === 'good';

    if (allGood) {
      if (autoCaptureStartRef.current === null) {
        autoCaptureStartRef.current = Date.now();
      }

      const elapsed = Date.now() - autoCaptureStartRef.current;
      const progress = Math.min((elapsed / 2000) * 100, 100);
      setAutoCaptureProgress(progress);

      // Tocar beep de contagem nos últimos 3 segundos (a cada segundo)
      if (elapsed >= 1000 && elapsed < 1100) {
        playCountdownBeep();
      } else if (elapsed >= 2000 && elapsed < 2100) {
        playCountdownBeep();
      }

      if (elapsed >= 2000) {
        // Capturar automaticamente
        capturePhoto();
      }
    } else {
      setAutoCaptureProgress(0);
      autoCaptureStartRef.current = null;
    }
  }, [qualityIndicators, autoCapture]);

  const startCamera = async () => {
    try {
      setVideoReady(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: guideType === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Usar múltiplos eventos para garantir que a câmera carregue
        const handleCanPlay = () => {
          console.log('Video can play');
          videoRef.current?.play().then(() => {
            console.log('Video playing');
            setVideoReady(true);
          }).catch(err => {
            console.error('Error playing video:', err);
          });
        };
        
        videoRef.current.onloadedmetadata = handleCanPlay;
        videoRef.current.oncanplay = handleCanPlay;
        
        // Fallback: forçar play após 1 segundo se não carregar
        setTimeout(() => {
          if (!videoReady && videoRef.current) {
            console.log('Forcing video play (fallback)');
            videoRef.current.play().then(() => {
              setVideoReady(true);
            }).catch(err => {
              console.error('Fallback play error:', err);
            });
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setVideoReady(false);
    setAutoCapture(false);
    setAutoCaptureProgress(0);
    autoCaptureStartRef.current = null;
  };

  const checkQualityRealtime = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Usar um canvas menor para performance
    const sampleWidth = 320;
    const sampleHeight = 240;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    
    const indicators = analyzeImageQuality(imageData);
    setQualityIndicators(indicators);
  };

  const analyzeImageQuality = (imageData: ImageData): QualityIndicators => {
    const data = imageData.data;
    let totalBrightness = 0;
    let pixelCount = 0;

    // Calcular brilho médio
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }

    const avgBrightness = totalBrightness / pixelCount;

    // Determinar nível de brilho
    let brightnessLevel: QualityLevel;
    if (avgBrightness < 50 || avgBrightness > 220) {
      brightnessLevel = 'error';
    } else if (avgBrightness < 80 || avgBrightness > 200) {
      brightnessLevel = 'warning';
    } else {
      brightnessLevel = 'good';
    }

    // Detecção de nitidez usando Laplaciano
    const width = imageData.width;
    const height = imageData.height;
    let laplacianSum = 0;
    let laplacianCount = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        const top = (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3;
        const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
        const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
        const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;

        const laplacian = Math.abs(4 * center - top - bottom - left - right);
        laplacianSum += laplacian;
        laplacianCount++;
      }
    }

    const sharpnessValue = laplacianSum / laplacianCount;

    // Determinar nível de nitidez
    let sharpnessLevel: QualityLevel;
    if (sharpnessValue < 10) {
      sharpnessLevel = 'error';
    } else if (sharpnessValue < 20) {
      sharpnessLevel = 'warning';
    } else {
      sharpnessLevel = 'good';
    }

    return {
      brightness: { level: brightnessLevel, value: avgBrightness },
      sharpness: { level: sharpnessLevel, value: sharpnessValue }
    };
  };

  const validateImageQuality = (imageData: ImageData): { isValid: boolean; message: string } => {
    const data = imageData.data;
    let totalBrightness = 0;
    let pixelCount = 0;

    // Calcular brilho médio
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }

    const avgBrightness = totalBrightness / pixelCount;

    // Verificar iluminação (muito escura ou muito clara)
    if (avgBrightness < 50) {
      return { isValid: false, message: 'Foto muito escura. Por favor, melhore a iluminação.' };
    }
    if (avgBrightness > 220) {
      return { isValid: false, message: 'Foto muito clara. Por favor, reduza a iluminação.' };
    }

    // Detecção simples de blur usando variância de Laplaciano
    const width = imageData.width;
    const height = imageData.height;
    let laplacianSum = 0;
    let laplacianCount = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        const top = (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3;
        const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
        const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
        const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;

        const laplacian = Math.abs(4 * center - top - bottom - left - right);
        laplacianSum += laplacian;
        laplacianCount++;
      }
    }

    const laplacianVariance = laplacianSum / laplacianCount;

    // Se a variância for muito baixa, a imagem está desfocada
    if (laplacianVariance < 10) {
      return { isValid: false, message: 'Foto desfocada. Por favor, mantenha a câmera estável e tente novamente.' };
    }

    return { isValid: true, message: 'Qualidade OK' };
  };

  const compressImage = async (canvas: HTMLCanvasElement): Promise<{ blob: Blob; quality: number }> => {
    const MAX_WIDTH = 1920;
    const MAX_HEIGHT = 1920;
    const TARGET_SIZE_KB = 500; // Tamanho alvo em KB

    let width = canvas.width;
    let height = canvas.height;

    // Redimensionar se necessário
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

    // Comprimir progressivamente até atingir o tamanho alvo
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

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      alert('Câmera não está pronta. Aguarde um momento.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Aguarde a câmera carregar completamente.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Erro ao processar imagem.');
      return;
    }

    ctx.drawImage(video, 0, 0);

    // Validar qualidade da imagem
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const validation = validateImageQuality(imageData);

    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    try {
      // Tocar som de captura
      playCaptureSound();

      // Comprimir imagem
      const { blob, quality } = await compressImage(canvas);
      
      if (!blob) {
        alert('Erro ao processar foto. Tente novamente.');
        return;
      }

      console.log(`Imagem comprimida com qualidade ${(quality * 100).toFixed(0)}%, tamanho: ${(blob.size / 1024).toFixed(2)}KB`);

      const file = new File([blob], `${label.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
      const previewUrl = canvas.toDataURL('image/jpeg', quality);
      onCapture(file);
      setPreview(previewUrl);
      stopCamera();
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      alert('Erro ao capturar foto. Tente novamente.');
    }
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
          
          {/* Indicadores de qualidade */}
          {qualityIndicators && (
            <div className="absolute top-4 left-4 right-4 flex gap-2 pointer-events-none z-10">
              <Badge 
                variant={qualityIndicators.brightness.level === 'good' ? 'default' : qualityIndicators.brightness.level === 'warning' ? 'secondary' : 'destructive'}
                className={cn(
                  "flex items-center gap-1.5 animate-fade-in",
                  qualityIndicators.brightness.level === 'good' && "bg-green-600 hover:bg-green-700",
                  qualityIndicators.brightness.level === 'warning' && "bg-yellow-600 hover:bg-yellow-700",
                  qualityIndicators.brightness.level === 'error' && "bg-red-600 hover:bg-red-700"
                )}
              >
                <Sun className="w-3 h-3" />
                <span className="text-xs">
                  {qualityIndicators.brightness.level === 'good' && 'Iluminação OK'}
                  {qualityIndicators.brightness.level === 'warning' && 'Ajuste a luz'}
                  {qualityIndicators.brightness.level === 'error' && 'Iluminação ruim'}
                </span>
              </Badge>

              <Badge 
                variant={qualityIndicators.sharpness.level === 'good' ? 'default' : qualityIndicators.sharpness.level === 'warning' ? 'secondary' : 'destructive'}
                className={cn(
                  "flex items-center gap-1.5 animate-fade-in",
                  qualityIndicators.sharpness.level === 'good' && "bg-green-600 hover:bg-green-700",
                  qualityIndicators.sharpness.level === 'warning' && "bg-yellow-600 hover:bg-yellow-700",
                  qualityIndicators.sharpness.level === 'error' && "bg-red-600 hover:bg-red-700"
                )}
              >
                <Focus className="w-3 h-3" />
                <span className="text-xs">
                  {qualityIndicators.sharpness.level === 'good' && 'Foco OK'}
                  {qualityIndicators.sharpness.level === 'warning' && 'Estabilize'}
                  {qualityIndicators.sharpness.level === 'error' && 'Foto desfocada'}
                </span>
              </Badge>
            </div>
          )}

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
          
          {!videoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <span className="text-white text-sm">Carregando câmera...</span>
            </div>
          )}

          {/* Barra de progresso para captura automática */}
          {autoCapture && autoCaptureProgress > 0 && (
            <div className="absolute bottom-20 left-4 right-4 bg-black/70 rounded-lg p-3 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-xs font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3 text-green-400" />
                  Capturando automaticamente...
                </span>
                <span className="text-white text-xs">{Math.round(autoCaptureProgress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-100 ease-linear"
                  style={{ width: `${autoCaptureProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-3 mt-4">
            {/* Toggle de captura automática */}
            <div className="flex items-center justify-between bg-black/50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <Label htmlFor="auto-capture" className="text-white text-sm cursor-pointer">
                  Captura Automática
                </Label>
              </div>
              <Switch
                id="auto-capture"
                checked={autoCapture}
                onCheckedChange={setAutoCapture}
                disabled={!videoReady}
              />
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
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
                disabled={!videoReady || autoCapture}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Camera className="w-4 h-4 mr-2" />
                {autoCapture ? 'Modo Auto' : videoReady ? 'Capturar' : 'Aguarde...'}
              </Button>
            </div>
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
