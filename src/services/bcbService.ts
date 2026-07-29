export const getAccumulatedIndex = async (type: 'IPCA' | 'IGPM', months: number = 12): Promise<number> => {
  // BCB API codes: IPCA = 433, IGP-M = 189
  const seriesCode = type === 'IPCA' ? 433 : 189;
  
  // To get the last 12 months, we can get the last 12 values
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/${months}?formato=json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} data from BCB`);
    }
    const data: Array<{ data: string; valor: string }> = await response.json();
    
    // Accumulate the percentage changes. Formula for accumulation: (1 + i1/100) * (1 + i2/100) ... - 1
    let accumulatedFactor = 1;
    for (const entry of data) {
      const rate = parseFloat(entry.valor) / 100;
      accumulatedFactor *= (1 + rate);
    }
    
    // Return the accumulated percentage
    return (accumulatedFactor - 1) * 100;
  } catch (error) {
    console.error(`Error fetching BCB data for ${type}:`, error);
    throw error;
  }
};
