import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationData {
  city: string | null;
  country: string | null;
  count: number;
  lat?: number;
  lng?: number;
}

// City coordinates mapping (common cities)
const cityCoordinates: Record<string, [number, number]> = {
  'São Paulo': [-23.5505, -46.6333],
  'Rio de Janeiro': [-22.9068, -43.1729],
  'Belo Horizonte': [-19.9167, -43.9345],
  'Brasília': [-15.7942, -47.8822],
  'Salvador': [-12.9714, -38.5014],
  'Fortaleza': [-3.7172, -38.5433],
  'Curitiba': [-25.4284, -49.2733],
  'Recife': [-8.0476, -34.8770],
  'Porto Alegre': [-30.0346, -51.2177],
  'Manaus': [-3.1190, -60.0217],
  'Belém': [-1.4558, -48.4902],
  'Goiânia': [-16.6869, -49.2648],
  'Guarulhos': [-23.4538, -46.5333],
  'Campinas': [-22.9056, -47.0608],
  'São Luís': [-2.5297, -44.3028],
  'Maceió': [-9.6498, -35.7089],
  'Natal': [-5.7945, -35.2110],
  'João Pessoa': [-7.1195, -34.8450],
  'Teresina': [-5.0892, -42.8019],
  'Campo Grande': [-20.4697, -54.6201],
  'Cuiabá': [-15.6014, -56.0979],
  'Aracaju': [-10.9472, -37.0731],
  'Florianópolis': [-27.5954, -48.5480],
  'Vitória': [-20.2976, -40.2958],
  'Londrina': [-23.3045, -51.1696],
  'Santos': [-23.9608, -46.3336],
  // International cities
  'New York': [40.7128, -74.0060],
  'Los Angeles': [-33.7490, -118.2437],
  'London': [51.5074, -0.1278],
  'Paris': [48.8566, 2.3522],
  'Tokyo': [35.6762, 139.6503],
  'Berlin': [52.5200, 13.4050],
  'Madrid': [40.4168, -3.7038],
  'Rome': [41.9028, 12.4964],
  'Sydney': [-33.8688, 151.2093],
  'Toronto': [43.6532, -79.3832],
  'Mexico City': [19.4326, -99.1332],
  'Buenos Aires': [-34.6037, -58.3816],
  'Lima': [-12.0464, -77.0428],
  'Bogotá': [4.7110, -74.0721],
  'Santiago': [-33.4489, -70.6693],
  'Lisboa': [38.7223, -9.1393],
  'Lisbon': [38.7223, -9.1393],
  'Porto': [41.1579, -8.6291],
};

// Country coordinates (center point)
const countryCoordinates: Record<string, [number, number]> = {
  'Brasil': [-14.2350, -51.9253],
  'Brazil': [-14.2350, -51.9253],
  'United States': [37.0902, -95.7129],
  'USA': [37.0902, -95.7129],
  'Portugal': [39.3999, -8.2245],
  'Argentina': [-38.4161, -63.6167],
  'Mexico': [23.6345, -102.5528],
  'Spain': [40.4637, -3.7492],
  'France': [46.6034, 1.8883],
  'Germany': [51.1657, 10.4515],
  'Italy': [41.8719, 12.5674],
  'United Kingdom': [55.3781, -3.4360],
  'UK': [55.3781, -3.4360],
  'Canada': [56.1304, -106.3468],
  'Japan': [36.2048, 138.2529],
  'Australia': [-25.2744, 133.7751],
  'Chile': [-35.6751, -71.5430],
  'Colombia': [4.5709, -74.2973],
  'Peru': [-9.1900, -75.0152],
};

export default function VisitorHeatMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  // Fetch location data
  const fetchLocationData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select('city, country')
        .not('city', 'is', null);

      if (error) throw error;

      // Aggregate by city/country
      const aggregated: Record<string, LocationData> = {};
      
      (data || []).forEach((log) => {
        const key = `${log.city || 'Unknown'}-${log.country || 'Unknown'}`;
        if (!aggregated[key]) {
          aggregated[key] = {
            city: log.city,
            country: log.country,
            count: 0,
          };
        }
        aggregated[key].count++;
      });

      // Add coordinates
      const withCoords = Object.values(aggregated).map((loc) => {
        let coords: [number, number] | undefined;
        
        // Try city first
        if (loc.city && cityCoordinates[loc.city]) {
          coords = cityCoordinates[loc.city];
        }
        // Fall back to country
        else if (loc.country && countryCoordinates[loc.country]) {
          coords = countryCoordinates[loc.country];
        }
        
        return {
          ...loc,
          lat: coords ? coords[0] : undefined,
          lng: coords ? coords[1] : undefined,
        };
      }).filter(loc => loc.lat !== undefined && loc.lng !== undefined);

      setLocationData(withCoords);
    } catch (error) {
      console.error('Error fetching location data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || locationData.length === 0) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-51.9253, -14.2350], // Brazil center
      zoom: 3,
      pitch: 30,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      if (!map.current) return;

      // Add source for heatmap
      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: locationData.map((loc) => ({
          type: 'Feature',
          properties: {
            count: loc.count,
            city: loc.city,
            country: loc.country,
          },
          geometry: {
            type: 'Point',
            coordinates: [loc.lng!, loc.lat!],
          },
        })),
      };

      map.current.addSource('visitors', {
        type: 'geojson',
        data: geojsonData,
      });

      // Add heatmap layer
      map.current.addLayer({
        id: 'visitors-heat',
        type: 'heatmap',
        source: 'visitors',
        maxzoom: 15,
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            0, 0,
            100, 1,
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3,
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33, 102, 172, 0)',
            0.2, 'rgb(103, 169, 207)',
            0.4, 'rgb(209, 229, 240)',
            0.6, 'rgb(253, 219, 119)',
            0.8, 'rgb(239, 138, 98)',
            1, 'rgb(178, 24, 43)',
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 20,
            9, 50,
          ],
          'heatmap-opacity': 0.8,
        },
      });

      // Add circle layer for individual points at higher zoom
      map.current.addLayer({
        id: 'visitors-points',
        type: 'circle',
        source: 'visitors',
        minzoom: 7,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, 5,
            100, 20,
          ],
          'circle-color': 'hsl(var(--primary))',
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
          'circle-opacity': 0.8,
        },
      });

      // Add popups
      map.current.on('click', 'visitors-points', (e) => {
        if (!e.features?.[0]) return;
        
        const props = e.features[0].properties;
        const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div style="padding: 8px;">
              <strong>${props?.city || 'Desconhecido'}</strong><br/>
              <span style="color: #666;">${props?.country || ''}</span><br/>
              <span style="font-size: 14px; font-weight: bold; color: hsl(var(--primary));">
                ${props?.count} visita${props?.count > 1 ? 's' : ''}
              </span>
            </div>
          `)
          .addTo(map.current!);
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'visitors-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'visitors-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, locationData]);

  if (!mapboxToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Calor - Visitantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Carregando mapa...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Mapa de Calor - Origem dos Visitantes
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchLocationData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[500px] rounded-lg overflow-hidden border">
          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapContainer} className="absolute inset-0" />
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 z-10">
            <div className="text-xs font-medium mb-2">Intensidade de Visitas</div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm bg-[rgb(103,169,207)]" />
              <div className="w-4 h-3 rounded-sm bg-[rgb(209,229,240)]" />
              <div className="w-4 h-3 rounded-sm bg-[rgb(253,219,119)]" />
              <div className="w-4 h-3 rounded-sm bg-[rgb(239,138,98)]" />
              <div className="w-4 h-3 rounded-sm bg-[rgb(178,24,43)]" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Baixa</span>
              <span>Alta</span>
            </div>
          </div>
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 z-10">
            <div className="text-sm font-medium">{locationData.length} localidades</div>
            <div className="text-xs text-muted-foreground">
              {locationData.reduce((acc, loc) => acc + loc.count, 0)} visitas
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
