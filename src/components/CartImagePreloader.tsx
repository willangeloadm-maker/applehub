import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { useCart } from "@/hooks/useCart";

/**
 * Componente que faz preload das imagens dos produtos no carrinho
 * para melhorar a performance de carregamento
 */
export const CartImagePreloader = () => {
  const { cartItems } = useCart();

  // Extrai URLs únicas de imagens
  const imageUrls = cartItems
    .map(item => item.products.imagens?.[0])
    .filter((url): url is string => !!url && url.length > 0);

  // Remove duplicatas
  const uniqueImageUrls = Array.from(new Set(imageUrls));

  return (
    <Helmet>
      {uniqueImageUrls.map((url) => (
        <link key={url} rel="preload" as="image" href={url} />
      ))}
    </Helmet>
  );
};
