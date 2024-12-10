function queryFiatViaLIFI(chain, token) {
    // Create a new XMLHttpRequest object
    const xhr = new XMLHttpRequest();

    // Set the request URL with query parameters
    const url = `https://li.quest/v1/token?chain=${encodeURIComponent(chain)}&token=${encodeURIComponent(token)}`;

    // Open a GET request
    xhr.open('GET', url, false);

    // Send the request
    xhr.send();

    // Parse the JSON response
    const decodedResponse = JSON.parse(xhr.responseText);

    // Extract Fiat price only
    const fiatPrice = Number(decodedResponse.priceUSD);

    // Return the fiat price
    return fiatPrice;
}

export default queryFiatViaLIFI;