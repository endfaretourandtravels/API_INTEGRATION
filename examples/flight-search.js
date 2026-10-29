const { searchFlights } = require('../src/flights');

async function main() {
  const request = {
    origin: 'DEL',
    destination: 'BOM',
    departureDate: '2026-11-15',
    //returnDate: null,
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: 'ECONOMY',
    currency: 'INR',
  };

  console.log('Flight search request:\n', JSON.stringify(request, null, 2), '\n');

  try {
    const result = await searchFlights(request);
    console.log('\nFlight search response:\n', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    if (err.data) console.error('Response body:', JSON.stringify(err.data, null, 2));
    process.exitCode = 1;
  }
}

main();
