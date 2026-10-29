(function () {
  const form = document.getElementById('search-form');
  if (!form) return;

  const requestView = document.getElementById('request-view');
  const responseView = document.getElementById('response-view');
  const statusEl = document.getElementById('status');
  const button = form.querySelector('button[type="submit"]');
  const flightResults = document.getElementById('flight-results');
  const flightSummary = document.getElementById('flight-summary');
  const loadingIndicator = document.getElementById('search-loading');
  const bookingSection = document.getElementById('booking-section');
  const selectedItinerary = document.getElementById('selected-itinerary');
  const passengerFields = document.getElementById('passenger-fields');
  const selectedFare = document.getElementById('selected-fare');
  const fareBreakdown = document.getElementById('fare-breakdown');
  const fareNote = document.getElementById('fare-note');
  const fareLoading = document.getElementById('fare-loading');
  const fareError = document.getElementById('fare-error');
  const fareExtras = document.getElementById('fare-extras');
  const fareRulesDetails = document.getElementById('fare-rules-details');
  const fareRules = document.getElementById('fare-rules');
  const fareResponse = document.getElementById('fare-response');
  const fareResponseDetails = document.getElementById('fare-response-details');
  const passengerForm = document.getElementById('passenger-form');
  const passengerMessage = document.getElementById('passenger-message');
  const bookingDisclaimer = document.getElementById('booking-disclaimer');
  const bookingReview = document.getElementById('booking-review');
  const reviewItinerary = document.getElementById('review-itinerary');
  const reviewPassengers = document.getElementById('review-passengers');
  const reviewQuotedFare = document.getElementById('review-quoted-fare');
  const finalFare = document.getElementById('final-fare');
  const finalFareLoading = document.getElementById('final-fare-loading');
  const finalFareError = document.getElementById('final-fare-error');
  const finalFareNote = document.getElementById('final-fare-note');
  const finalFareBreakdown = document.getElementById('final-fare-breakdown');
  const finalFareValidationDetails = document.getElementById('final-fare-validation-details');
  const finalFareBookingId = document.getElementById('final-fare-booking-id');
  const finalFareApiReference = document.getElementById('final-fare-api-reference');
  const finalFareResponse = document.getElementById('final-fare-response');
  const finalFareResponseDetails = document.getElementById('final-fare-response-details');
  const issueTicketActions = document.getElementById('issue-ticket-actions');
  const issueTicketButton = document.getElementById('issue-ticket');
  const ticketSection = document.getElementById('ticket-section');
  const pnrLoading = document.getElementById('pnr-loading');
  const pnrError = document.getElementById('pnr-error');
  const bookingTicket = document.getElementById('booking-ticket');
  const ticketCongratulations = document.getElementById('ticket-congratulations');
  const ticketPnr = document.getElementById('ticket-pnr');
  const ticketBookingId = document.getElementById('ticket-booking-id');
  const ticketBookingDate = document.getElementById('ticket-booking-date');
  const ticketAirline = document.getElementById('ticket-airline');
  const ticketStatus = document.getElementById('ticket-status');
  const ticketFlightDetails = document.getElementById('ticket-flight-details');
  const ticketPassengers = document.getElementById('ticket-passengers');
  const ticketBaggage = document.getElementById('ticket-baggage');
  const ticketClass = document.getElementById('ticket-class');
  const ticketMeal = document.getElementById('ticket-meal');
  const ticketTotal = document.getElementById('ticket-total');
  const pnrResponse = document.getElementById('pnr-response');
  bookingReview.appendChild(ticketSection);
  const searchButtonText = button.textContent;
  let searchPayload = null;
  let fareQuoteSequence = 0;
  let finalFareSequence = 0;
  let pnrSequence = 0;
  let selectedFlight = null;
  let latestQuotedFare = null;
  let latestFareQuoteData = null;
  let fareQuoteRequest = Promise.resolve();
  let ticketRequestContext = null;

  function text(value, fallback = '—') {
    return value === undefined || value === null || value === '' ? fallback : String(value);
  }

  function addText(parent, tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return text(value);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function formatTicketDate(value, options) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return text(value);
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function calculateAge(value) {
    const birthDate = new Date(value);
    if (Number.isNaN(birthDate.getTime())) return '—';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? String(age) : '—';
  }

  function findResponseValue(value, names) {
    if (!value || typeof value !== 'object') return null;
    const expected = new Set(names.map((name) => name.toLowerCase()));
    const queue = [value];
    const visited = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object' || visited.has(current)) continue;
      visited.add(current);
      for (const [key, child] of Object.entries(current)) {
        if (expected.has(key.toLowerCase()) && child !== null && child !== undefined && child !== '') {
          return child;
        }
        if (child && typeof child === 'object') queue.push(child);
      }
    }
    return null;
  }

  function readFare(flight) {
    const fare = flight.FareDetails || {};
    const chargeable = fare.ChargeableFares || {};
    if (chargeable.NetFare) return chargeable.NetFare;
    const fareAry = fare.FareBreakUp && fare.FareBreakUp.FareAry;
    if (Array.isArray(fareAry) && fareAry[0] && fareAry[0].TotalPrice) {
      return fareAry[0].TotalPrice;
    }
    return fare.TotalFare || flight.TotalFare || null;
  }

  function readQuotedFare(value) {
    if (!value || typeof value !== 'object') return null;
    const fare = value.FareDetails || value.FareQuote || value;
    const chargeable = fare.ChargeableFares || {};
    if (chargeable.NetFare) return chargeable.NetFare;
    if (chargeable.TotalFare) return chargeable.TotalFare;
    if (fare.NetFare) return fare.NetFare;
    if (fare.TotalFare) return fare.TotalFare;
    if (fare.TotalPrice) return fare.TotalPrice;
    if (fare.GrandTotal) return fare.GrandTotal;
    if (fare.FinalFare) return fare.FinalFare;
    return null;
  }

  function renderFareQuoteDetails(data) {
    fareBreakdown.replaceChildren();
    fareExtras.replaceChildren();
    fareRulesDetails.hidden = true;
    fareRules.textContent = '';

    const chargeable = data && data.ChargeableFares;
    if (chargeable && typeof chargeable === 'object') {
      const amounts = [
        ['Base fare', chargeable.ActualBaseFare],
        ['Approximate base price', chargeable.ApproximateBasePrice],
        ['Tax', chargeable.Tax],
        ['Fees', chargeable.Fees],
      ];
      for (const [label, amount] of amounts) {
        if (amount !== null && amount !== undefined && amount !== '') {
          const row = document.createElement('p');
          row.className = 'fare-breakdown-row';
          addText(row, 'span', '', label);
          addText(row, 'strong', '', String(amount));
          fareBreakdown.appendChild(row);
        }
      }
      if (chargeable.IsEligibleForTicket !== undefined) {
        addFareExtra(`Eligible for ticket: ${chargeable.IsEligibleForTicket ? 'Yes' : 'No'}`);
      }
      if (chargeable.IsNonRefundableTicket !== undefined) {
        addFareExtra(`Non-refundable: ${chargeable.IsNonRefundableTicket ? 'Yes' : 'No'}`);
      }
    }

    const fareRows = data && data.FareBreakUp && data.FareBreakUp.FareAry;
    if (Array.isArray(fareRows)) {
      for (const row of fareRows) {
        const count = Number(row.TotalPassengerCode);
        const passengerLabel = row.IntPassengerType || 'Passenger';
        const label = Number.isFinite(count) && count > 0
          ? `${passengerLabel} × ${count}`
          : passengerLabel;
        const amount = row.TotalPrice || [row.IntBaseFare, row.IntTax].filter(Boolean).join(' + ');
        if (amount) {
          const item = document.createElement('p');
          item.className = 'fare-breakdown-row';
          addText(item, 'span', '', label);
          addText(item, 'strong', '', String(amount));
          fareBreakdown.appendChild(item);
        }
      }
    }

    if (Array.isArray(data && data.SearchPassengers) && data.SearchPassengers.length) {
      addFareSectionHeading(`${data.SearchPassengers.length} passenger${data.SearchPassengers.length === 1 ? '' : 's'} priced`);
    }

    const mealGroups = data && data.MealOrBeveragesToBuy;
    if (Array.isArray(mealGroups)) {
      const meals = mealGroups.flatMap((group) => Array.isArray(group.MealAndBeverageList) ? group.MealAndBeverageList : []);
      if (meals.length) {
        addFareSectionHeading('Optional meals');
        for (const meal of meals) {
          addFareExtra(`${text(meal.Title, meal.DisplayText || 'Meal')} — ${text(meal.TotalPrice)}`);
        }
      }
    }

    const baggageGroups = data && data.ExtraBaggageToBuy;
    if (Array.isArray(baggageGroups)) {
      addFareSectionHeading('Optional extra baggage');
      for (const baggage of baggageGroups) {
        addFareExtra(`${text(baggage.Title || baggage.DisplayText, 'Extra baggage')} — ${text(baggage.TotalPrice)}`);
      }
    }

    if (typeof (data && data.FareRule) === 'string' && data.FareRule.trim()) {
      fareRules.textContent = data.FareRule;
      fareRulesDetails.hidden = false;
    }
  }

  function addFareExtra(message) {
    const item = document.createElement('p');
    item.className = 'fare-extra';
    item.textContent = message;
    fareExtras.appendChild(item);
  }

  function addFareSectionHeading(label) {
    addText(fareExtras, 'h4', 'fare-extras-heading', label);
  }

  function addFareBreakdownRow(container, label, value) {
    if (value === null || value === undefined || value === '') return;
    const row = document.createElement('p');
    row.className = 'fare-breakdown-row';
    addText(row, 'span', '', label);
    addText(row, 'strong', '', String(value));
    container.appendChild(row);
  }

  function renderFinalFareDetails(data) {
    finalFareBreakdown.replaceChildren();
    finalFareValidationDetails.replaceChildren();

    const chargeable = data && data.FareDetails && data.FareDetails.ChargeableFares;
    if (chargeable) {
      addFareBreakdownRow(finalFareBreakdown, 'Base fare', chargeable.ActualBaseFare);
      addFareBreakdownRow(finalFareBreakdown, 'Tax', chargeable.Tax);
      addFareBreakdownRow(finalFareBreakdown, 'Fees', chargeable.Fees);
      addFareBreakdownRow(finalFareBreakdown, 'Discount', chargeable.Discount);
      addFareBreakdownRow(finalFareBreakdown, 'Meal discount', chargeable.MealDiscount);
      if (chargeable.IsEligibleForTicket !== null && chargeable.IsEligibleForTicket !== undefined) {
        addFareBreakdownRow(
          finalFareValidationDetails,
          'Eligible for ticket',
          chargeable.IsEligibleForTicket ? 'Yes' : 'No',
        );
      }
    }

    addFareBreakdownRow(finalFareValidationDetails, 'Status', data && data.Message);
    addFareBreakdownRow(finalFareValidationDetails, 'Reference number', data && data.ReferenceNo);
    addFareBreakdownRow(finalFareValidationDetails, 'Current balance', data && data.CurrentBalance);
    finalFareBookingId.textContent = data && data.BookingId ? data.BookingId : 'Not provided';
    finalFareApiReference.textContent = data && data.ApiReferenceNo ? data.ApiReferenceNo : 'Not provided';
  }

  function readTicketSegments(data) {
    const groups = [
      data && data.DomesticOnwardFlights,
      data && data.InternationalOnwardFlights,
      data && data.OnwardFlights,
    ];
    for (const flights of groups) {
      if (Array.isArray(flights) && flights[0] && Array.isArray(flights[0].FlightSegments)) {
        return flights[0].FlightSegments;
      }
    }
    return Array.isArray(selectedFlight && selectedFlight.FlightSegments)
      ? selectedFlight.FlightSegments
      : [];
  }

  function readTicketEntries(data) {
    const tickets = findResponseValue(data, ['Tickets', 'TicketDetails']);
    if (Array.isArray(tickets)) return tickets;
    return [];
  }

  function renderTicket(data, bookingId, passengerData, validationData) {
    const segments = readTicketSegments(data);
    const firstSegment = segments[0] || {};
    const lastSegment = segments[segments.length - 1] || firstSegment;
    const airline = firstSegment.AirLineName
      || firstSegment.IntOperatingAirlineName
      || firstSegment.OperatingAirlineCode
      || 'Airline';
    const generatedPnr = findResponseValue(data, [
      'PnrNo',
      'PNRNo',
      'Pnr',
      'PNR',
      'PnrNumber',
      'PNRNumber',
      'ApiReferenceNo',
    ]);
    const bookingDate = findResponseValue(data, ['BookingDate', 'CreatedDate', 'TransactionDate']);
    const status = findResponseValue(data, ['ResponseStatus', 'BookingStatusText', 'StatusMessage'])
      || findResponseValue(data, ['Message'])
      || 'Confirmed';
    const confirmationMessage = findResponseValue(data, ['Message']);
    const tickets = readTicketEntries(data);
    const fallbackTicketNumber = findResponseValue(data, ['EticketNo', 'ETicketNo', 'TicketNo', 'TicketNumber']);

    ticketPnr.textContent = text(generatedPnr, 'Not provided');
    ticketBookingId.textContent = bookingId;
    ticketBookingDate.textContent = formatTicketDate(bookingDate, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    ticketAirline.textContent = airline;
    ticketStatus.textContent = String(status);
    ticketCongratulations.textContent = String(status).toLowerCase() === 'confirmed'
      ? 'Congratulations! Your Flight Ticket is Confirmed'
      : text(confirmationMessage, 'Flight Booking Confirmation');

    ticketFlightDetails.replaceChildren();
    const departure = document.createElement('div');
    departure.className = 'ticket-flight-point';
    addText(departure, 'strong', '', text(firstSegment.DepartureAirportCode || firstSegment.Origin));
    addText(departure, 'span', '', text(firstSegment.Origin));
    const route = document.createElement('div');
    route.className = 'ticket-flight-line';
    addText(route, 'span', '', '');
    addText(route, 'strong', '', `${airline} ${text(firstSegment.FlightNumber, '')}`.trim());
    addText(route, 'small', '', text(firstSegment.Duration, text(selectedFlight && selectedFlight.TotalNoofhours)));
    const arrival = document.createElement('div');
    arrival.className = 'ticket-flight-point';
    addText(arrival, 'strong', '', text(lastSegment.ArrivalAirportCode || lastSegment.Destination));
    addText(arrival, 'span', '', text(lastSegment.Destination));
    const departureTime = document.createElement('div');
    departureTime.className = 'ticket-flight-meta';
    addText(departureTime, 'span', '', 'Departure');
    addText(departureTime, 'strong', '', formatTicketDate(firstSegment.DepartureDateTime, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }));
    const arrivalTime = document.createElement('div');
    arrivalTime.className = 'ticket-flight-meta';
    addText(arrivalTime, 'span', '', 'Arrival');
    addText(arrivalTime, 'strong', '', formatTicketDate(lastSegment.ArrivalDateTime, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }));
    ticketFlightDetails.append(departure, route, arrival, departureTime, arrivalTime);

    ticketPassengers.replaceChildren();
    Array.from(passengerData.values()).forEach((passenger, index) => {
      const ticket = tickets[index] || {};
      const row = document.createElement('tr');
      const values = [
        index + 1,
        `${text(passenger.givenName, '')} ${text(passenger.surname, '')}`.trim(),
        calculateAge(passenger.birthDate),
        passenger.gender,
        ticket.SeatNo || ticket.SeatNumber || 'Not assigned',
        ticket.TicketNo || ticket.TicketNumber || ticket.EticketNo || fallbackTicketNumber || 'Not provided',
      ];
      values.forEach((value) => addText(row, 'td', '', text(value)));
      ticketPassengers.appendChild(row);
    });

    const baggage = firstSegment.BaggageAllowed && firstSegment.BaggageAllowed.CheckInBaggage;
    ticketBaggage.textContent = baggage || 'See fare conditions';
    ticketClass.textContent = text(
      firstSegment.BookingClass && firstSegment.BookingClass.CabinClass,
      searchPayload.TravelClass,
    );
    const mealCount = Number(findResponseValue(data, ['TotalMealItems'])) || 0;
    ticketMeal.textContent = mealCount > 0 ? `${mealCount} meal item${mealCount === 1 ? '' : 's'}` : 'Not included';
    ticketTotal.textContent = readQuotedFare(data)
      || readQuotedFare(validationData)
      || latestQuotedFare
      || readFare(selectedFlight)
      || 'Not provided';
    pnrResponse.textContent = JSON.stringify(data, null, 2);
  }

  async function requestIssueTicket(bookingId, passengerData, validationData) {
    const sequence = ++pnrSequence;
    ticketSection.hidden = false;
    pnrLoading.hidden = false;
    pnrError.hidden = true;
    pnrError.textContent = '';
    bookingTicket.hidden = true;
    pnrResponse.textContent = '';
    ticketSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (!bookingId) {
      pnrLoading.hidden = true;
      pnrError.textContent = 'The fare validation response did not include a BookingId, so a ticket could not be issued.';
      pnrError.hidden = false;
      return false;
    }

    try {
      const response = await fetch('/api/issueticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await response.json().catch(() => null);
      if (sequence !== pnrSequence) return;
      if (!response.ok) {
        const message = data && (data.Message || data.message);
        throw new Error(message || `Ticket issuance failed with status ${response.status}`);
      }

      renderTicket(data, bookingId, passengerData, validationData);
      bookingTicket.hidden = false;
      return true;
    } catch (error) {
      if (sequence !== pnrSequence) return;
      pnrError.textContent = error.message;
      pnrError.hidden = false;
      return false;
    } finally {
      if (sequence === pnrSequence) pnrLoading.hidden = true;
    }
  }

  function mapFareQuoteSegment(segment) {
    return {
      AirEquipType: segment.AirEquipType,
      ArrivalAirportCode: segment.ArrivalAirportCode,
      ArrivalDateTime: segment.ArrivalDateTime,
      ApisRequirementsRef: segment.ApisRequirementsRef,
      ChangeOfPlane: segment.ChangeOfPlane,
      DepartureAirportCode: segment.DepartureAirportCode,
      DepartureDateTime: segment.DepartureDateTime,
      OriginTerminal: segment.OriginTerminal ?? null,
      DestinationTerminal: segment.DestinationTerminal ?? null,
      Equipment: segment.Equipment,
      FlightNumber: segment.FlightNumber,
      FareBaseCode: segment.FareBaseCode,
      Group: segment.Group,
      Origin: segment.Origin,
      Destination: segment.Destination,
      AirLineName: segment.AirLineName,
      OptionalServicesIndicator: segment.OptionalServicesIndicator,
      Duration: segment.Duration,
      BookingClass: segment.BookingClass,
      CodeShareInformation: segment.CodeShareInformation,
      HostToken: segment.HostToken,
      BaggageAllowed: segment.BaggageAllowed,
      ImageFileName: segment.ImageFileName,
      IntOperatingAirlineName: segment.IntOperatingAirlineName,
      OperatingAirlineCode: segment.OperatingAirlineCode,
      OperatingAirlineFlightNumber: segment.OperatingAirlineFlightNumber,
      SegmentKey: segment.SegmentKey,
      ProviderCode: segment.ProviderCode,
      SupplierCode: segment.SupplierCode,
      Status: segment.Status ?? null,
    };
  }

  function buildFareQuotePayload(flight) {
    const requestDetails = flight.RequestDetails || {};
    return {
      AdultPax: searchPayload.Adults,
      ChildPax: searchPayload.Children,
      InfantPax: searchPayload.Infants,
      TravelClass: searchPayload.TravelClass,
      OnwardFlightSegments: (flight.FlightSegments || []).map(mapFareQuoteSegment),
      IsStudent: searchPayload.IsStudent,
      IsInternational: requestDetails.IsInternational ?? searchPayload.IsInternational ?? false,
      RequestTimestamp: new Date().toISOString(),
      IsTesting: searchPayload.IsTesting,
    };
  }

  async function requestFareQuote(flight) {
    const sequence = ++fareQuoteSequence;
    const payload = buildFareQuotePayload(flight);
    selectedFare.textContent = 'Checking fare…';
    fareError.hidden = true;
    fareError.textContent = '';
    fareLoading.hidden = false;
    fareResponseDetails.hidden = true;
    fareResponse.textContent = '';
    fareNote.textContent = 'Requesting the current fare for this selected itinerary.';

    try {
      const response = await fetch('/api/farequote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (sequence !== fareQuoteSequence) return;
      fareResponse.textContent = JSON.stringify(data, null, 2);
      fareResponseDetails.hidden = false;
      if (!response.ok) {
        const message = data && (data.Message || data.message);
        throw new Error(message || `Fare quote failed with status ${response.status}`);
      }

      latestFareQuoteData = data;
      renderFareQuoteDetails(data);
      const quotedFare = readQuotedFare(data);
      if (quotedFare) {
        latestQuotedFare = quotedFare;
        selectedFare.textContent = quotedFare;
        fareNote.textContent = 'Fare returned by the fare quote API.';
      } else {
        selectedFare.textContent = 'Quote received';
        fareNote.textContent = 'The API response did not contain a recognized fare field. See the response below.';
      }
    } catch (error) {
      if (sequence !== fareQuoteSequence) return;
      latestFareQuoteData = null;
      fareError.textContent = error.message;
      fareError.hidden = false;
      selectedFare.textContent = readFare(flight) || 'Fare quote unavailable';
      fareNote.textContent = 'Showing the search-result fare when available. Retry by selecting Book Now again.';
    } finally {
      if (sequence === fareQuoteSequence) fareLoading.hidden = true;
    }
  }

  function renderFlightCard(flight) {
    const segments = Array.isArray(flight.FlightSegments) ? flight.FlightSegments : [];
    const first = segments[0] || {};
    const last = segments[segments.length - 1] || first;
    const card = document.createElement('article');
    card.className = 'flight-card';

    const top = document.createElement('div');
    top.className = 'flight-card-top';
    const airline = first.AirLineName || first.IntOperatingAirlineName || first.OperatingAirlineCode || first.SupplierCode || 'Airline';
    addText(top, 'h4', 'flight-airline', `${airline} · ${text(first.FlightNumber, 'Flight details unavailable')}`);
    card.appendChild(top);

    const route = document.createElement('div');
    route.className = 'flight-route';
    const depart = document.createElement('div');
    depart.className = 'flight-point';
    addText(depart, 'strong', '', text(first.DepartureAirportCode || first.Origin));
    addText(depart, 'span', '', formatDateTime(first.DepartureDateTime));
    const line = document.createElement('div');
    line.className = 'flight-route-line';
    addText(line, 'span', '', text(flight.TotalNoofhours || first.Duration, 'Duration unavailable'));
    const arrive = document.createElement('div');
    arrive.className = 'flight-point flight-arrival';
    addText(arrive, 'strong', '', text(last.ArrivalAirportCode || last.Destination));
    addText(arrive, 'span', '', formatDateTime(last.ArrivalDateTime));
    route.append(depart, line, arrive);
    card.appendChild(route);

    const details = document.createElement('div');
    details.className = 'flight-card-details';
    const stopCount = Number.isFinite(Number(flight.NoofStops))
      ? Number(flight.NoofStops)
      : Math.max(0, segments.length - 1);
    addText(details, 'span', '', stopCount === 0 ? 'Non-stop' : `${stopCount} stop${stopCount === 1 ? '' : 's'}`);
    addText(details, 'span', '', text(first.BookingClass && first.BookingClass.CabinClass, text(flight.RequestDetails && flight.RequestDetails.TravelClass)));
    addText(details, 'span', '', text(flight.FareDetails && flight.FareDetails.FareFamily, 'Fare details'));
    card.appendChild(details);

    const baggage = first.BaggageAllowed && first.BaggageAllowed.CheckInBaggage;
    if (baggage) {
      const baggageText = String(baggage).split(/\r?\n/).map((part) => part.trim()).find((part) => /baggage allowance/i.test(part));
      if (baggageText) addText(card, 'p', 'flight-baggage', baggageText.replace(/^-+\s*/, ''));
    }

    const offer = document.createElement('div');
    offer.className = 'flight-offer';
    const fare = readFare(flight);
    if (fare) addText(offer, 'div', 'flight-fare', fare);
    else addText(offer, 'div', 'flight-fare flight-fare-missing', 'Fare not provided');
    const bookButton = addText(offer, 'button', 'btn book-now-button', 'Book Now');
    bookButton.type = 'button';
    bookButton.addEventListener('click', () => showBookingDetails(flight));
    card.appendChild(offer);
    flightResults.appendChild(card);
  }

  function addDetail(container, label, value) {
    const row = document.createElement('p');
    row.className = 'itinerary-detail';
    addText(row, 'strong', '', `${label}: `);
    row.appendChild(document.createTextNode(text(value)));
    container.appendChild(row);
  }

  function showBookingDetails(flight) {
    selectedFlight = flight;
    latestQuotedFare = null;
    latestFareQuoteData = null;
    finalFareSequence++;
    pnrSequence++;
    ticketSection.hidden = true;
    issueTicketActions.hidden = true;
    issueTicketButton.disabled = false;
    issueTicketButton.textContent = 'Issue Ticket';
    ticketRequestContext = null;
    bookingReview.hidden = true;
    bookingDisclaimer.hidden = searchPayload.IsTesting !== true;
    selectedItinerary.replaceChildren();
    const segments = Array.isArray(flight.FlightSegments) ? flight.FlightSegments : [];
    segments.forEach((segment, index) => {
      const segmentPanel = document.createElement('div');
      segmentPanel.className = 'itinerary-segment';
      addText(segmentPanel, 'h4', '', `Flight segment ${index + 1}`);
      addDetail(segmentPanel, 'Airline', segment.AirLineName || segment.IntOperatingAirlineName || segment.OperatingAirlineCode);
      addDetail(segmentPanel, 'Flight', segment.FlightNumber);
      addDetail(segmentPanel, 'From', `${text(segment.DepartureAirportCode || segment.Origin)}${segment.OriginTerminal ? ` · Terminal ${segment.OriginTerminal}` : ''}`);
      addDetail(segmentPanel, 'Departure', `${formatDateTime(segment.DepartureDateTime)} (${text(segment.DepartureDateTime)})`);
      addDetail(segmentPanel, 'To', `${text(segment.ArrivalAirportCode || segment.Destination)}${segment.DestinationTerminal ? ` · Terminal ${segment.DestinationTerminal}` : ''}`);
      addDetail(segmentPanel, 'Arrival', `${formatDateTime(segment.ArrivalDateTime)} (${text(segment.ArrivalDateTime)})`);
      addDetail(segmentPanel, 'Duration', segment.Duration);
      addDetail(segmentPanel, 'Cabin', segment.BookingClass && segment.BookingClass.CabinClass);
      addDetail(segmentPanel, 'Booking code', segment.BookingClass && segment.BookingClass.BookingCode);
      addDetail(segmentPanel, 'Aircraft', segment.Equipment || segment.AirEquipType);
      const baggage = segment.BaggageAllowed && segment.BaggageAllowed.CheckInBaggage;
      if (baggage) addDetail(segmentPanel, 'Baggage / fare conditions', baggage);
      selectedItinerary.appendChild(segmentPanel);
    });
    if (segments.length === 0) addText(selectedItinerary, 'p', '', 'Segment details are not available for this result.');
    if (flight.FareDetails && flight.FareDetails.FareFamily) {
      addDetail(selectedItinerary, 'Fare family', flight.FareDetails.FareFamily);
    }
    if (flight.IsLcc !== undefined) addDetail(selectedItinerary, 'Low-cost carrier', flight.IsLcc ? 'Yes' : 'No');

    const fare = readFare(flight);
    selectedFare.textContent = fare || 'Fare not provided';
    fareNote.textContent = 'Requesting a current fare for the selected itinerary…';

    passengerFields.replaceChildren();
    const passengerTypes = [
      ['Adults', 'Adult', 'adt'],
      ['Children', 'Child', 'chd'],
      ['Infants', 'Infant', 'inf'],
    ];
    let passengerNumber = 0;
    for (const [key, type, code] of passengerTypes) {
      const count = Number(searchPayload && searchPayload[key]) || 0;
      for (let i = 0; i < count; i++) {
        passengerNumber++;
        const group = document.createElement('fieldset');
        group.className = 'passenger-group';
        group.dataset.passengerType = code;
        addText(group, 'legend', '', `${type} ${i + 1}`);
        const fields = document.createElement('div');
        fields.className = 'passenger-inputs';
        const prefix = `passenger-${passengerNumber}`;
        const inputs = [
          ['First name', 'givenName', 'text', true],
          ['Last name', 'surname', 'text', true],
          ['Date of birth', 'birthDate', 'date', true],
          ['Gender', 'gender', 'select', true],
        ];
        for (const [label, name, kind, required] of inputs) {
          const fieldLabel = document.createElement('label');
          fieldLabel.textContent = label;
          const input = kind === 'select' ? document.createElement('select') : document.createElement('input');
          input.name = `${prefix}-${name}`;
          input.required = required;
          if (kind === 'date') input.type = 'date';
          if (kind === 'text') {
            input.type = 'text';
            input.autocomplete = name === 'givenName' ? 'given-name' : 'family-name';
          }
          if (kind === 'select') {
            input.add(new Option('Select gender', ''));
            input.add(new Option('Female', 'Female'));
            input.add(new Option('Male', 'Male'));
            input.add(new Option('Other', 'Other'));
          }
          fieldLabel.appendChild(input);
          fields.appendChild(fieldLabel);
        }
        group.appendChild(fields);
        passengerFields.appendChild(group);
      }
    }
    passengerMessage.hidden = true;
    bookingSection.hidden = false;
    bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fareQuoteRequest = requestFareQuote(flight);
  }

  function readPassengerData() {
    const passengerData = new Map();
    for (const [name, value] of new FormData(passengerForm).entries()) {
      const match = /^passenger-(\d+)-(givenName|surname|birthDate|gender)$/.exec(name);
      if (!match) continue;
      const [, passengerId, field] = match;
      if (!passengerData.has(passengerId)) passengerData.set(passengerId, {});
      passengerData.get(passengerId)[field] = value;
    }
    return passengerData;
  }

  function renderBookingReview(passengerData) {
    reviewItinerary.replaceChildren();
    reviewPassengers.replaceChildren();

    const segments = Array.isArray(selectedFlight && selectedFlight.FlightSegments)
      ? selectedFlight.FlightSegments
      : [];
    segments.forEach((segment) => {
      const item = document.createElement('div');
      item.className = 'review-flight-segment';
      const airline = segment.AirLineName || segment.IntOperatingAirlineName || segment.OperatingAirlineCode || 'Airline';
      addText(item, 'h4', '', `${airline} · Flight ${text(segment.FlightNumber)}`);
      const route = document.createElement('p');
      route.className = 'review-flight-route';
      addText(route, 'strong', '', text(segment.DepartureAirportCode || segment.Origin));
      addText(route, 'span', '', '→');
      addText(route, 'strong', '', text(segment.ArrivalAirportCode || segment.Destination));
      item.appendChild(route);
      addDetail(item, 'Departure', `${formatDateTime(segment.DepartureDateTime)} (${text(segment.DepartureDateTime)})`);
      addDetail(item, 'Arrival', `${formatDateTime(segment.ArrivalDateTime)} (${text(segment.ArrivalDateTime)})`);
      reviewItinerary.appendChild(item);
    });
    if (segments.length === 0) addText(reviewItinerary, 'p', '', 'Selected flight details are unavailable.');

    passengerFields.querySelectorAll('.passenger-group').forEach((group, index) => {
      const passenger = passengerData.get(String(index + 1)) || {};
      const summary = document.createElement('div');
      summary.className = 'review-passenger';
      addText(summary, 'h4', '', group.querySelector('legend').textContent);
      addDetail(summary, 'Name', `${text(passenger.givenName, '')} ${text(passenger.surname, '')}`.trim() || '—');
      addDetail(summary, 'Date of birth', passenger.birthDate);
      addDetail(summary, 'Gender', passenger.gender);
      reviewPassengers.appendChild(summary);
    });
    if (passengerData.size === 0) addText(reviewPassengers, 'p', '', 'No passenger details were entered.');

    reviewQuotedFare.textContent = latestQuotedFare || readFare(selectedFlight) || 'Not available';
  }

  function buildValidateFarePayload(passengerData) {
    const segments = selectedFlight.FlightSegments || [];
    const firstSegment = segments[0] || {};
    const lastSegment = segments[segments.length - 1] || firstSegment;
    const requestDetails = selectedFlight.RequestDetails || {};
    const passengers = Array.from(passengerData.values());
    const passengerGroups = Array.from(passengerFields.querySelectorAll('.passenger-group'));
    const genderCodes = { Female: 'F', Male: 'M', Other: 'O' };
    const titleCodes = { Female: 'MS', Male: 'MR', Other: 'MX' };

    return {
      AdultPax: searchPayload.Adults,
      ChildPax: searchPayload.Children,
      InfantPax: searchPayload.Infants,
      Destination: searchPayload.Destination,
      DepartureDateTime: firstSegment.DepartureDateTime,
      ArrivalDateTime: lastSegment.ArrivalDateTime,
      dob: passengers.map((passenger) => passenger.birthDate).join(','),
      PassengerEmailId: 'sales@endfare.com',
      Genders: passengers.map((passenger) => genderCodes[passenger.gender] || '').join(','),
      IsInternational: requestDetails.IsInternational ?? searchPayload.IsInternational ?? false,
      MobileNo: '9654742889',
      Names: passengers.map((passenger, index) => {
        const type = passengerGroups[index] && passengerGroups[index].dataset.passengerType;
        return [
          titleCodes[passenger.gender] || 'MX',
          passenger.givenName,
          passenger.surname,
          type || 'adt',
        ].join('|');
      }).join(','),
      OnwardFlightSegments: segments.map(mapFareQuoteSegment),
      SearchPassengers: Array.isArray(latestFareQuoteData && latestFareQuoteData.SearchPassengers)
        ? latestFareQuoteData.SearchPassengers
        : [],
      PassportDetails: '',
      Rule: typeof (latestFareQuoteData && latestFareQuoteData.FareRule) === 'string'
        ? latestFareQuoteData.FareRule
        : '',
      Source: searchPayload.Source,
      TravelClass: searchPayload.TravelClass,
      TripType: 1,
      IsStudent: searchPayload.IsStudent,
      MealSegments: [],
      RequestTimestamp: new Date().toISOString(),
      IsTesting: searchPayload.IsTesting,
    };
  }

  async function requestFinalFare(passengerData) {
    const sequence = ++finalFareSequence;
    finalFare.textContent = 'Validating fare…';
    finalFareLoading.hidden = false;
    finalFareError.hidden = true;
    finalFareError.textContent = '';
    finalFareResponseDetails.hidden = true;
    finalFareResponse.textContent = '';
    finalFareBreakdown.replaceChildren();
    finalFareValidationDetails.replaceChildren();
    finalFareBookingId.textContent = 'Pending';
    finalFareApiReference.textContent = 'Pending';
    finalFareNote.textContent = 'Validating the final fare for this itinerary and these passengers.';
    pnrSequence++;
    ticketSection.hidden = true;
    issueTicketActions.hidden = true;
    issueTicketButton.disabled = false;
    issueTicketButton.textContent = 'Issue Ticket';
    ticketRequestContext = null;

    await fareQuoteRequest;
    if (sequence !== finalFareSequence) return;

    const payload = buildValidateFarePayload(passengerData);
    try {
      const response = await fetch('/api/validatefare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (sequence !== finalFareSequence) return;
      finalFareResponse.textContent = JSON.stringify(data, null, 2);
      finalFareResponseDetails.hidden = false;
      if (!response.ok) {
        const message = data && (data.Message || data.message);
        throw new Error(message || `Final fare validation failed with status ${response.status}`);
      }

      const validatedFare = readQuotedFare(data);
      renderFinalFareDetails(data);
      finalFare.textContent = validatedFare || 'Fare validated';
      finalFareNote.textContent = validatedFare
        ? 'Final fare returned by the fare validation API.'
        : 'The fare was validated, but the response did not contain a recognized fare field.';
      if (data && data.BookingId) {
        ticketRequestContext = {
          bookingId: data.BookingId,
          passengerData,
          validationData: data,
        };
        issueTicketActions.hidden = false;
      } else {
        pnrError.textContent = 'The fare validation response did not include a BookingId, so a ticket cannot be issued.';
      }
    } catch (error) {
      if (sequence !== finalFareSequence) return;
      finalFare.textContent = 'Validation failed';
      finalFareBookingId.textContent = 'Not available';
      finalFareApiReference.textContent = 'Not available';
      finalFareError.textContent = error.message;
      finalFareError.hidden = false;
      finalFareNote.textContent = 'The final fare could not be validated. Return to passenger details and try again.';
    } finally {
      if (sequence === finalFareSequence) finalFareLoading.hidden = true;
    }
  }

  function renderFlights(data) {
    flightResults.replaceChildren();
    if (!data || typeof data !== 'object') {
      flightSummary.textContent = 'The API response did not contain flight data.';
      return;
    }

    const groups = [
      ['DomesticOnwardFlights', 'Onward'],
      ['InternationalOnwardFlights', 'Onward'],
      ['OnwardFlights', 'Onward'],
      ['DomesticReturnFlights', 'Return'],
      ['InternationalReturnFlights', 'Return'],
      ['ReturnFlights', 'Return'],
    ];
    const seen = new Set();
    let count = 0;
    for (const [key, label] of groups) {
      const flights = data[key];
      if (!Array.isArray(flights) || seen.has(flights)) continue;
      seen.add(flights);
      for (const [index, flight] of flights.entries()) {
        renderFlightCard(flight || {});
        count++;
      }
    }

    const total = data.TotalRecords ?? count;
    const message = data.Message ? ` ${data.Message}` : '';
    flightSummary.textContent = count
      ? `Showing ${count} flight${count === 1 ? '' : 's'}${total !== count ? ` of ${total} available` : ''}.${message}`
      : `${data.Message || 'No flights were returned for this search.'}`;
  }

  if (bookingSection) {
    document.getElementById('back-to-flights').addEventListener('click', () => {
      bookingSection.hidden = true;
      flightResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    passengerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!passengerForm.reportValidity()) return;
      const passengerData = readPassengerData();
      renderBookingReview(passengerData);
      bookingSection.hidden = true;
      bookingReview.hidden = false;
      bookingReview.scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestFinalFare(passengerData);
    });

    document.getElementById('edit-passengers').addEventListener('click', () => {
      pnrSequence++;
      bookingReview.hidden = true;
      bookingSection.hidden = false;
      bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    issueTicketButton.addEventListener('click', async () => {
      if (!ticketRequestContext) return;
      issueTicketButton.disabled = true;
      issueTicketButton.textContent = 'Issuing Ticket…';
      const issued = await requestIssueTicket(
        ticketRequestContext.bookingId,
        ticketRequestContext.passengerData,
        ticketRequestContext.validationData,
      );
      if (issued) {
        issueTicketButton.textContent = 'Ticket Issued';
      } else {
        issueTicketButton.disabled = false;
        issueTicketButton.textContent = 'Retry Issue Ticket';
      }
    });
  }

  function buildPayload() {
    const payload = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      let value = el.value.trim();
      if (el.dataset.type === 'number') value = Number(value);
      else if (el.dataset.type === 'boolean') value = value === 'true';
      else if (el.dataset.type === 'checkbox-boolean') value = el.checked;
      else if (value === '') value = null;
      else if (['Source', 'Destination'].includes(el.name)) value = value.toUpperCase();
      payload[el.name] = value;
    }

    if (form.dataset.kind === 'hotel') {
      const { rooms, adults, children, ...rest } = payload;
      return { ...rest, rooms: Array.from({ length: rooms }, () => ({ adults, children })) };
    }
    if (form.dataset.kind === 'flight') {
      return {
        Source: payload.Source,
        Destination: payload.Destination,
        JourneyDate: payload.JourneyDate,
        ReturnDate: payload.JourneyDate,
        TripType: payload.TripType,
        FlightType: payload.FlightType,
        Adults: payload.Adults,
        Children: payload.Children,
        Infants: payload.Infants,
        TravelClass: payload.TravelClass,
        IsStudent: payload.IsStudent,
        IsTesting: payload.IsTesting,
      };
    }
    return payload;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    if (bookingSection) bookingSection.hidden = true;
    if (bookingReview) bookingReview.hidden = true;
    searchPayload = payload;
    requestView.textContent = JSON.stringify(payload, null, 2);
    responseView.textContent = 'Loading...';
    if (flightResults) {
      flightResults.replaceChildren();
      flightSummary.textContent = 'Searching flights...';
    }
    if (loadingIndicator) loadingIndicator.hidden = false;
    statusEl.textContent = '';
    statusEl.className = 'status';
    button.disabled = true;
    button.textContent = 'Searching...';

    try {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      statusEl.textContent = res.status;
      statusEl.classList.add(res.ok ? 'ok' : 'error');
      responseView.textContent = JSON.stringify(data, null, 2);
      if (flightResults) {
        if (res.ok) renderFlights(data);
        else flightSummary.textContent = data && data.Message ? data.Message : 'Flight search failed. See the raw API response below.';
      }
    } catch (err) {
      statusEl.textContent = 'ERR';
      statusEl.classList.add('error');
      responseView.textContent = err.message;
      if (flightResults) flightSummary.textContent = 'Unable to reach the flight API.';
    } finally {
      button.disabled = false;
      button.textContent = searchButtonText;
      if (loadingIndicator) loadingIndicator.hidden = true;
    }
  });
})();
