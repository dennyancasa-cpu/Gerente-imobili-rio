export interface AddressComponentsLike {
  address?: string;
  officialAddress?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

/**
 * Formata o endereço oficial padronizado de um imóvel para uso em contratos,
 * declarações, recibos e documentos jurídicos oficiais.
 * Exemplo: "Rua Augusta, nº 500 (Apto 42) - Consolação - São Paulo/SP - CEP: 01305-000"
 */
export function formatOfficialAddress(data?: AddressComponentsLike | null): string {
  if (!data) return '';

  const street = data.street?.trim() || '';
  const number = data.number?.trim() || '';
  const complement = data.complement?.trim() || '';
  const neighborhood = data.neighborhood?.trim() || '';
  const city = data.city?.trim() || '';
  const state = (data.state?.trim() || '').toUpperCase();
  const rawCep = (data.cep?.trim() || '').replace(/\D/g, '');
  const cepFormatted = rawCep.length === 8 ? rawCep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : data.cep?.trim() || '';

  // Se tiver componentes estruturados:
  if (street) {
    const parts: string[] = [];
    const streetWithNumber = number ? `${street}, nº ${number}` : street;
    const withComplement = complement ? `${streetWithNumber} (${complement})` : streetWithNumber;
    parts.push(withComplement);

    if (neighborhood) {
      parts.push(neighborhood);
    }

    if (city || state) {
      parts.push(`${city}${state ? `/${state}` : ''}`);
    }

    if (cepFormatted) {
      parts.push(`CEP: ${cepFormatted}`);
    }

    return parts.join(' - ');
  }

  // Se já tiver officialAddress salvo
  if (data.officialAddress?.trim()) {
    let result = data.officialAddress.trim();
    if (complement && !result.toLowerCase().includes(complement.toLowerCase())) {
      result = `${result} (${complement})`;
    }
    return result;
  }

  // Fallback para address legado
  let raw = data.address?.trim() || '';
  if (!raw) return '';

  if (complement && !raw.toLowerCase().includes(complement.toLowerCase())) {
    raw = `${raw} (${complement})`;
  }

  if (cepFormatted && !raw.toLowerCase().includes('cep')) {
    raw = `${raw} - CEP: ${cepFormatted}`;
  }

  return raw;
}
