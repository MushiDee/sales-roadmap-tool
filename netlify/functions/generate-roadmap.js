const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://mushidee.github.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': 'https://mushidee.github.io' },
      body: 'Method Not Allowed'
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { clientName, itChallenges, businessGoals, currentInfra, products } = data;

    // Construct prompt for Grok API
    const prompt = `
      You are an expert IT consultant. Based on the following client information, generate a 12-month IT roadmap with three milestones. Each milestone should include:
      - Name and timeframe (e.g., Months 1-4)
      - Deliverables: 3-5 specific outcomes
      - Approach: A non-technical explanation of how the work will be done
      - Risks: 2-3 potential challenges
      - KPIs: 3-5 measurable success metrics
      Also provide next steps for the client. The roadmap should be clear, professional, and non-technical for client understanding.

      Client Information:
      - Client Name: ${clientName}
      - IT Challenges: ${itChallenges}
      - Business Goals (Next 12 Months): ${businessGoals}
      - Current Infrastructure: ${currentInfra}
      - Products and Quantities: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Return the response in JSON format with:
      - milestones: Array of milestone objects (name, timeframe, deliverables, approach, risks, kpis)
      - nextSteps: String describing next steps
    `;

    // Call xAI Grok API
    const response = await fetch('https://api.x.ai/v1/grok', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API request failed: ${response.statusText}`);
    }

    const apiResponse = await response.json();
    console.log('Raw Grok API response:', apiResponse);

    let roadmap;
    try {
      roadmap = JSON.parse(apiResponse.text);
    } catch (e) {
      console.error('Invalid JSON response:', apiResponse.text);
      throw new Error('Invalid JSON response from Grok API');
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': 'https://mushidee.github.io' },
      body: JSON.stringify({ roadmap })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': 'https://mushidee.github.io' },
      body: JSON.stringify({ error: 'Failed to generate roadmap' })
    };
  }
};