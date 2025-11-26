import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface Variant {
  id: string;
  variant_product_id: string;
  estoque: number;
  preco_ajuste: number;
  attributes: Record<string, string>;
}

interface VariantSelectorProps {
  productId: string;
  basePrice: number;
  onVariantSelect: (variantId: string | null, finalPrice: number, stock: number) => void;
}

export default function VariantSelector({ productId, basePrice, onVariantSelect }: VariantSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<Record<string, string[]>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  useEffect(() => {
    loadVariants();
  }, [productId]);

  useEffect(() => {
    // Encontrar variante que corresponde aos atributos selecionados
    const matchingVariant = variants.find(v => {
      return Object.keys(selectedAttributes).every(
        key => v.attributes[key] === selectedAttributes[key]
      );
    });

    setSelectedVariant(matchingVariant || null);
    
    if (matchingVariant) {
      onVariantSelect(
        matchingVariant.variant_product_id,
        basePrice + matchingVariant.preco_ajuste,
        matchingVariant.estoque
      );
    } else {
      onVariantSelect(null, basePrice, 0);
    }
  }, [selectedAttributes, variants]);

  const loadVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          *,
          variant_product:products!variant_product_id(
            *,
            product_attributes(*)
          )
        `)
        .eq('parent_product_id', productId)
        .eq('ativo', true);

      if (error) throw error;

      const formattedVariants: Variant[] = data?.map((v: any) => {
        const attrs: Record<string, string> = {};
        v.variant_product?.product_attributes?.forEach((attr: any) => {
          attrs[attr.attribute_name] = attr.attribute_value;
        });

        return {
          id: v.id,
          variant_product_id: v.variant_product_id,
          estoque: v.estoque,
          preco_ajuste: v.preco_ajuste,
          attributes: attrs
        };
      }) || [];

      setVariants(formattedVariants);

      // Extrair opções únicas de cada atributo
      const options: Record<string, Set<string>> = {};
      formattedVariants.forEach(v => {
        Object.entries(v.attributes).forEach(([key, value]) => {
          if (!options[key]) options[key] = new Set();
          options[key].add(value);
        });
      });

      const optionsMap: Record<string, string[]> = {};
      Object.entries(options).forEach(([key, values]) => {
        optionsMap[key] = Array.from(values).sort();
      });

      setAttributeOptions(optionsMap);

      // Selecionar primeira opção de cada atributo automaticamente
      if (Object.keys(optionsMap).length > 0) {
        const initialSelection: Record<string, string> = {};
        Object.entries(optionsMap).forEach(([key, values]) => {
          if (values.length > 0) {
            initialSelection[key] = values[0];
          }
        });
        setSelectedAttributes(initialSelection);
      }

    } catch (error) {
      console.error('Erro ao carregar variantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttributeChange = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  const getAvailableOptions = (attributeName: string): string[] => {
    const options = attributeOptions[attributeName] || [];
    
    // Filtrar opções disponíveis baseado nas outras seleções
    const otherSelections = Object.entries(selectedAttributes)
      .filter(([key]) => key !== attributeName);

    if (otherSelections.length === 0) return options;

    return options.filter(option => {
      return variants.some(v => {
        const matchesOthers = otherSelections.every(
          ([key, val]) => v.attributes[key] === val
        );
        const matchesThis = v.attributes[attributeName] === option;
        return matchesOthers && matchesThis && v.estoque > 0;
      });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (variants.length === 0) {
    return null; // Produto sem variantes
  }

  return (
    <div className="space-y-6">
      {Object.entries(attributeOptions).map(([attributeName, options]) => {
        const availableOptions = getAvailableOptions(attributeName);
        
        return (
          <div key={attributeName} className="space-y-3">
            <Label className="text-base font-semibold">{attributeName}</Label>
            <RadioGroup
              value={selectedAttributes[attributeName]}
              onValueChange={(value) => handleAttributeChange(attributeName, value)}
              className="flex flex-wrap gap-2"
            >
              {options.map(option => {
                const isAvailable = availableOptions.includes(option);
                const isSelected = selectedAttributes[attributeName] === option;
                
                return (
                  <Label
                    key={option}
                    className={`
                      flex items-center justify-center min-w-[80px] px-4 py-2 rounded-lg border-2 cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-primary bg-primary/10 font-semibold' 
                        : 'border-border bg-background hover:border-primary/50'
                      }
                      ${!isAvailable && 'opacity-50 cursor-not-allowed'}
                    `}
                  >
                    <RadioGroupItem 
                      value={option} 
                      className="sr-only" 
                      disabled={!isAvailable}
                    />
                    <span>{option}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>
        );
      })}

      {/* Feedback de variante selecionada */}
      {selectedVariant && (
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium">
              Selecionado: {Object.values(selectedAttributes).join(' • ')}
            </p>
            <p className="text-lg font-bold text-primary mt-1">
              R$ {(basePrice + selectedVariant.preco_ajuste).toFixed(2)}
            </p>
          </div>
          <Badge variant={selectedVariant.estoque > 0 ? "default" : "destructive"} className="text-sm">
            {selectedVariant.estoque > 0 
              ? `${selectedVariant.estoque} em estoque` 
              : 'Indisponível'
            }
          </Badge>
        </div>
      )}

      {!selectedVariant && Object.keys(selectedAttributes).length > 0 && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          Esta combinação não está disponível. Tente outra seleção.
        </div>
      )}
    </div>
  );
}
