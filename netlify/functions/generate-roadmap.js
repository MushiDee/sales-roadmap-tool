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
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('Received request body:', event.body);
    const data = JSON.parse(event.body);
    const { clientName, itChallenges, businessGoals, currentInfra, products } = data;
    console.log('Parsed data:', { clientName, itChallenges, businessGoals, currentInfra, products });

    if (!process.env.GROK_API_KEY) {
      throw new Error('GROK_API_KEY environment variable is not set');
    }

    const prompt = `
      You are an expert IT consultant. Generate a 12-month IT roadmap with three milestones based on the following client information. Each milestone should include:
      - Name and timeframe (e.g., Months 1-4)
      - Deliverables: 3-5 specific outcomes
      - Approach: Non-technical explanation of how the work will be done
      - Risks: 2-3 potential challenges
      - KPIs: 3-5 measurable success metrics
      Also provide next steps for the client. The roadmap should be clear, professional, and non-technical.

      Client Information:
      - Client Name: ${clientName}
      - IT Challenges: ${itChallenges}
      - Business Goals: ${businessGoals}
      - Current Infrastructure: ${currentInfra}
      - Products and Quantities: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Return JSON.stringify({
        milestones: [{ name: string, timeframe: string, deliverables: string[], approach: string, risks: string[], kpis: string[] }, ...],
        nextSteps: string
      }).
    `;

    console.log('Sending request to Grok API with key:', process.env.GROK_API_KEY.slice(0, 4) + '...');
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are Grok, a highly intelligent, helpful AI assistant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'grok-3',
        stream: false,
        temperature: 0,
        max_tokens: 1500
      })
    });

    console.log('Grok API response status:', response.status, response.statusText);
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Grok API error response:', errorText);
      throw new Error(`Grok API request failed: ${response.status} - ${errorText}`);
    }

    const apiResponse = await response.json();
    console.log('Raw Grok API response:', apiResponse);

    let roadmap;
    try {
      roadmap = JSON.parse(apiResponse.choices[0].message.content);
      console.log('Parsed roadmap:', roadmap);
    } catch (e) {
      console.error('API response content:', apiResponse.choices[0].message.content);
      throw new Error(`Invalid JSON response from Grok API: ${e.message}`);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': 'https://mushidee.github.io' },
      body: JSON.stringify({ roadmap })
    };
  } catch (error) {
    console.error('Function error:', error.message, error.stack);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': 'https://mushidee.github.io' },
      body: JSON.stringify({ error: `Failed to generate roadmap: ${error.message}` })
    };
  }
};