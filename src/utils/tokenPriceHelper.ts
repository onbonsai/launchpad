async function queryFiatViaLIFI(chain: number, token: string): Promise<number> {
  try {
    // Set the request URL with query parameters
    const url = `https://li.quest/v1/token?chain=${encodeURIComponent(chain.toString())}&token=${encodeURIComponent(token)}`;

    // Make the fetch request
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response
    const decodedResponse = await response.json();

    // Extract Fiat price only
    const fiatPrice = Number(decodedResponse.priceUSD);

    // Return the fiat price
    return fiatPrice;
  } catch (error) {
    console.error('Error fetching token price:', error);
    return 0; // Return 0 or handle error as needed
  }
}

export default queryFiatViaLIFI;