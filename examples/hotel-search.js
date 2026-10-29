const { searchHotels } = require('../src/hotels');

async function main() {
  const request = {
    city: 'Mumbai',
    checkIn: '2026-11-15',
    checkOut: '2026-11-17',
    rooms: [{ adults: 2, children: 0 }],
    currency: 'INR',
  };

  console.log('Hotel search request:\n', JSON.stringify(request, null, 2), '\n');

  try {
    const result = await searchHotels(request);
    console.log('\nHotel search response:\n', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    if (err.data) console.error('Response body:', JSON.stringify(err.data, null, 2));
    process.exitCode = 1;
  }
}

main();
