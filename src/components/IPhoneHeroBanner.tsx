import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShaderAnimation } from "@/components/ShaderAnimation";
import iphoneColors from "@/assets/iphone-17-pro-max-colors.png";

interface IPhoneHeroBannerProps {
  productId: string | null;
}

export function IPhoneHeroBanner({ productId }: IPhoneHeroBannerProps) {
  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9] rounded-xl overflow-hidden shadow-2xl">
      {/* Shader Animation Background */}
      <div className="absolute inset-0">
        <ShaderAnimation />
      </div>
      
      {/* iPhone Image Layer */}
      <div className="absolute inset-0 z-[1] flex items-center justify-center">
        <img 
          src={iphoneColors} 
          alt="iPhone 17 Pro Max em várias cores"
          className="w-[70%] sm:w-[50%] lg:w-[40%] max-w-[600px] object-contain drop-shadow-2xl"
        />
      </div>
      
      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-[2]" />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 z-[3] flex flex-col items-center justify-end pb-6 sm:pb-10 px-4">
        {/* Badge */}
        <div className="mb-3 animate-pulse">
          <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
            Lançamento 2025
          </span>
        </div>
        
        {/* Title */}
        <h1 
          className="text-4xl sm:text-5xl lg:text-7xl font-black text-white uppercase tracking-tight text-center mb-2"
          style={{ 
            textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(255, 107, 53, 0.3)'
          }}
        >
          iPhone 17 Pro Max
        </h1>
        
        {/* Subtitle */}
        <p 
          className="text-lg sm:text-xl lg:text-2xl text-white/90 font-medium text-center mb-1"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
        >
          Preço imperdível • Parcele em até 24x
        </p>
        
        {/* Footnote */}
        <p className="text-xs sm:text-sm text-white/60 italic mb-4">
          *Sujeito a análise de crédito
        </p>
        
        {/* CTA Button */}
        {productId && (
          <Link to={`/produtos/${productId}`}>
            <Button 
              size="lg" 
              className="bg-white text-orange-600 hover:bg-orange-50 hover:scale-105 transition-all duration-300 font-bold text-base sm:text-lg px-8 py-6 shadow-xl"
            >
              Ver agora
            </Button>
          </Link>
        )}
        
        {/* Features */}
        <div className="flex items-center gap-4 sm:gap-8 mt-6 text-white/70 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Chip A19 Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Câmera 48MP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Titânio</span>
          </div>
        </div>
      </div>
    </div>
  );
}
