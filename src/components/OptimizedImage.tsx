import { useState, useEffect, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
  priority?: boolean;
}

const OptimizedImage = memo(({
  src,
  alt,
  className = "",
  aspectRatio = "auto",
  priority = false,
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    setImageSrc(src);
    setIsLoading(true);
    setIsError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsError(true);
    setIsLoading(false);
    setImageSrc("/placeholder.svg");
  };

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  };

  return (
    <div className={`relative overflow-hidden ${aspectClasses[aspectRatio]}`}>
      {/* Skeleton placeholder com shimmer */}
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="w-full h-full" />
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}
      
      {/* Imagem com blur progressivo */}
      <img
        src={imageSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`
          ${className}
          transition-all duration-700 ease-out
          ${isLoading ? "scale-110 blur-lg opacity-0" : "scale-100 blur-0 opacity-100"}
        `}
        style={{
          willChange: isLoading ? "transform, filter, opacity" : "auto",
        }}
      />
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
