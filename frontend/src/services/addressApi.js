const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';

export async function searchAddress(query, options = {}) {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(options.limit || 5),
    autocomplete: '1',
    ...(options.postcode ? { postcode: options.postcode } : {}),
  });

  const res = await fetch(`${BAN_URL}?${params}`);
  if (!res.ok) throw new Error('Erreur API adresse');

  const data = await res.json();

  return data.features.map((f) => ({
    label: f.properties.label,
    housenumber: f.properties.housenumber || '',
    street: f.properties.street || f.properties.name || '',
    postcode: f.properties.postcode || '',
    city: f.properties.city || '',
    coordinates: f.geometry.coordinates, // [lon, lat]
  }));
}
