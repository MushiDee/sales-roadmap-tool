const fetch = require('node-fetch');

// Simple JSON repair function to fix truncated JSON
function repairJson(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    let repaired = jsonString.trim();
    if (!repaired.endsWith('}')) {
      repaired = repaired.substring(0, repaired.lastIndexOf(',') + 1) + '}';
    }
    if (repaired.includes('"milestones":[') && !repaired.includes(']')) {
      repaired = repaired.substring(0, repaired.lastIndexOf('{')) + ']}';
    }
    try {
      return JSON.parse(repaired);
    } catch (err) {
      throw new Error(`Failed to repair JSON: ${err.message}`);
    }
  }
}

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
      Generate a 12-month IT roadmap with three milestones for the client below. Each milestone needs:
      - Name and timeframe (e.g., Months 1-4)
      - 3-5 deliverables
      - Non-technical approach explanation
      - 2-3 risks
      - 3-5 KPIs
      Include next steps. Keep it clear and professional.

      Client:
      - Name: ${clientName}
      - IT Challenges: ${itChallenges}
      - Business Goals: ${businessGoals}
      - Infrastructure: ${currentInfra}
      - Products: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Return JSON.stringify({
        milestones: [{ name: string, timeframe: string, deliverables: string[], approach: string, risks: string[], kpis: string[] }, ...],
        nextSteps: string
      }).
    `;

    console.log('Sending request to Grok API with key:', process.env.GROK_API_KEY.slice(0, 4) + '...');

    // Set a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.5-second timeout

    let roadmap;
    try {
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
              content: 'You are Grok, a helpful AI assistant.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: 'grok-3',
          stream: false,
          temperature: 0,
          max_tokens: 600
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Grok API response status:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Grok API error response:', errorText);
        throw new Error(`Grok API request failed: ${response.status} - ${errorText}`);
      }

      const apiResponse = await response.json();
      console.log('Raw Grok API response:', apiResponse);

      try {
        roadmap = repairJson(apiResponse.choices[0].message.content);
        console.log('Parsed roadmap:', roadmap);
      } catch (e) {
        console.error('API response content:', apiResponse.choices[0].message.content);
        throw new Error(`Invalid JSON response from Grok API: ${e.message}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.warn('API request timed out, returning fallback roadmap');
        roadmap = {
          milestones: [
            {
              name: 'Initial Setup',
              timeframe: 'Months 1-4',
              deliverables: ['Assess current IT systems', 'Plan initial product deployment'],
              approach: 'Review your infrastructure and selected products to create a deployment plan.',
              risks: ['Delays due to slow API response', 'Incomplete data access'],
              kpis: ['Complete assessment in 6 weeks', 'Plan approved by Month 2']
            }
          ],
          nextSteps: 'Schedule a meeting to discuss initial setup, as the AI roadmap generation timed out. Contact support for assistance.'
        };
      } else {
        throw error;
      }
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