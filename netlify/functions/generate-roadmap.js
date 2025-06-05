const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const corsOrigin = 'https://mushidee.github.io';
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };

  console.log('Function invoked:', { method: event.httpMethod, path: event.path, bodyLength: event.body ? event.body.length : 0 });

  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    console.log('Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('Parsing request body');
    const data = JSON.parse(event.body || '{}');
    const { clientName, itChallenges, businessGoals, currentInfra, products } = data;

    if (!clientName || !itChallenges || !businessGoals || !currentInfra || !products || !Array.isArray(products)) {
      console.log('Invalid input data:', data);
      throw new Error('Invalid input data');
    }

    console.log('Constructing enhanced prompt');
    const prompt = `
      You are an expert IT consultant for a managed services provider specializing in IT support and Microsoft Cloud services. Create a 12-month IT roadmap with three milestones tailored to the client's needs, infrastructure, and selected products. For each product in each milestone, include:
      - A project plan with 3 tasks (e.g., discovery, configuration, training), each with a timeline (e.g., Week 1-2), effort hours (e.g., 10 hours), product, and dependencies (e.g., licensing excluded).
      - A summary table listing each task, hours, and product.
      - Response points: How the product addresses the client's challenges and contributes to their goals.
      - One industry best practice guideline (e.g., ITIL 4, NIST, Microsoft Zero Trust).
      Each milestone must include:
      - A unique name and timeframe (e.g., Months 1-4).
      - 2-3 deliverables, each tied to a product’s quantity and client needs.
      - An approach in clear, non-technical language, linking response points to challenges and goals.
      - 2 risks specific to the infrastructure or deployment.
      - 3 measurable KPIs tailored to the client’s scale and outcomes (e.g., "95% ticket resolution within 1 hour").
      For Managed remote Helpdesk, specify 8/5 or 24/7 service based on client challenges (e.g., 24/7 for critical systems). Provide 2-3 next steps with timelines (e.g., within 2 weeks) and product-specific actions. Use exact product names to avoid misspellings. Keep the response professional, client-centric, and jargon-free.

      Service Context (abridged):
      - Managed Vendors: Coordinates vendors, no licensing costs.
      - Managed remote Helpdesk: 8/5 support (24/7 optional), ticketing license excluded.
      - Managed Onsite Support technician (in hours): Hourly on-site support, no licensing.
      - Managed M365 instance: Manages M365 tenants, licenses excluded.
      - Managed Local Area network service: Monitors LAN, hardware/licenses excluded.
      - Managed Servers: Manages servers, hardware/OS licenses excluded.
      - Managed Firewalls: Configures firewalls, hardware/licenses excluded.
      - Managed Azure IaaS service: Deploys Azure infrastructure, subscription costs excluded.
      - Managed Cybersecurity & SOC service: 24/7 monitoring, security tool licenses excluded.

      Client Information:
      - Name: ${clientName}
      - Challenges: ${itChallenges}
      - Goals: ${businessGoals}
      - Infrastructure: ${currentInfra}
      - Products: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Return JSON with:
      - milestones: array of milestone objects (name, timeframe, deliverables, approach, risks, kpis, productsUsed, projectPlan, bestPractices, summaryTable)
      - nextSteps: string

      Ensure projectPlan and summaryTable are included for each milestone.
    `;

    console.log('Calling xAI Grok API');
    const startTime = Date.now();
    let apiResponse;
    try {
      apiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (process.env.GROK_API_KEY || ''),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-3',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.7
        }),
        timeout: 7000 // 7-second timeout
      });
    } catch (err) {
      console.error('API fetch error:', err.message, { duration: Date.now() - startTime });
      console.log('Using fallback roadmap due to API timeout');
      const fallbackRoadmap = {
        milestones: [
          {
            name: "Foundation Setup",
            timeframe: "Months 1-4",
            deliverables: products.map(p => `Deploy ${p.quantity} units of ${p.product}`),
            approach: `Initiate setup to address ${itChallenges}, supporting ${businessGoals}.`,
            risks: ['Deployment delays', 'Resource constraints'],
            kpis: ['90% system uptime', 'Complete initial setup in 3 months', '50% reduction in outage incidents'],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Assess ${p.product}`, timeline: "Week 1-2", effortHours: 10, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
              { task: `Configure ${p.product}`, timeline: "Week 3-4", effortHours: 15, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
              { task: `Train for ${p.product}`, timeline: "Week 5-6", effortHours: 10, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: p.product.includes('Helpdesk') ? 'Follow ITIL 4 for incident management' :
                         p.product.includes('M365') ? 'Implement Microsoft Zero Trust' :
                         p.product.includes('Cybersecurity') ? 'Adhere to NIST guidelines' :
                         `Ensure standard deployment for ${p.product}`
            })),
            summaryTable: products.flatMap(p => [
              { task: `Assess ${p.product}`, hours: 10, product: p.product },
              { task: `Configure ${p.product}`, hours: 15, product: p.product },
              { task: `Train for ${p.product}`, hours: 10, product: p.product }
            ])
          },
          {
            name: "Optimization Phase",
            timeframe: "Months 5-8",
            deliverables: products.map(p => `Optimize ${p.quantity} units of ${p.product} for performance`),
            approach: `Enhance system performance to support ${businessGoals}.`,
            risks: ['Integration issues', 'User adoption delays'],
            kpis: ['95% system uptime', '80% user adoption rate', 'Reduce response time by 20%'],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Monitor ${p.product}`, timeline: "Week 1-2", effortHours: 8, product: p.product, dependencies: 'None' },
              { task: `Tune ${p.product}`, timeline: "Week 3-4", effortHours: 12, product: p.product, dependencies: 'None' },
              { task: `Validate ${p.product}`, timeline: "Week 5-6", effortHours: 8, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: p.product.includes('Helpdesk') ? 'ITIL 4 service optimization' :
                         p.product.includes('M365') ? 'Microsoft best practices for collaboration' :
                         p.product.includes('Cybersecurity') ? 'NIST continuous monitoring' :
                         `Optimize ${p.product} performance`
            })),
            summaryTable: products.flatMap(p => [
              { task: `Monitor ${p.product}`, hours: 8, product: p.product },
              { task: `Tune ${p.product}`, hours: 12, product: p.product },
              { task: `Validate ${p.product}`, hours: 8, product: p.product }
            ])
          },
          {
            name: "Full Integration",
            timeframe: "Months 9-12",
            deliverables: products.map(p => `Fully integrate ${p.quantity} units of ${p.product}`),
            approach: `Complete integration to achieve ${businessGoals}.`,
            risks: ['Data migration issues', 'System downtime'],
            kpis: ['99% system uptime', '100% user training completion', 'Achieve migration goals'],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Integrate ${p.product}`, timeline: "Week 1-2", effortHours: 10, product: p.product, dependencies: p.product.includes('Azure') ? 'Subscription costs excluded' : 'None' },
              { task: `Test ${p.product}`, timeline: "Week 3-4", effortHours: 10, product: p.product, dependencies: 'None' },
              { task: `Rollout ${p.product}`, timeline: "Week 5-6", effortHours: 10, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: p.product.includes('Helpdesk') ? 'ITIL 4 service continuity' :
                         p.product.includes('M365') ? 'Microsoft security compliance' :
                         p.product.includes('Cybersecurity') ? 'NIST incident response' :
                         `Ensure full integration for ${p.product}`
            })),
            summaryTable: products.flatMap(p => [
              { task: `Integrate ${p.product}`, hours: 10, product: p.product },
              { task: `Test ${p.product}`, hours: 10, product: p.product },
              { task: `Rollout ${p.product}`, hours: 10, product: p.product }
            ])
          }
        ],
        nextSteps: `Review setup with ${clientName} within 2 weeks; procure necessary licenses within 1 month; schedule training within 3 weeks.`
      };
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ roadmap: fallbackRoadmap })
      };
    }

    console.log(`API response status: ${apiResponse.status}, duration: ${Date.now() - startTime} ms`);
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API request failed:', apiResponse.status, errorText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: `API request failed: ${errorText}` })
      };
    }

    const apiResponseData = await apiResponse.json();
    console.log('Raw Grok API response length:', JSON.stringify(apiResponseData).length);

    let roadmap;
    try {
      console.log('Parsing API response');
      if (!apiResponseData.choices || !apiResponseData.choices[0]?.message?.content) {
        throw new Error('No valid content in API response');
      }
      roadmap = JSON.parse(apiResponseData.choices[0].message.content);
      console.log('Parsed roadmap objects:', roadmap.milestones?.length || 0);
      if (!roadmap.milestones.every(m => m.projectPlan && Array.isArray(m.projectPlan) && m.projectPlan.length >= 3 * products.length && m.summaryTable && Array.isArray(m.summaryTable) && m.summaryTable.length >= 3 * products.length)) {
        console.error('Missing projectPlan or summaryTable');
        throw new Error('Missing or incomplete projectPlan or summaryTable');
      }
      console.log('Project plans included:', roadmap.milestones.every(m => m.projectPlan?.length > 0));
      console.log('Summary tables included:', roadmap.milestones.every(m => m.summaryTable?.length > 0));
    } catch (e) {
      console.error('Invalid JSON or incomplete response:', apiResponseData.choices?.[0]?.message?.content || '', e.message);
      roadmap = {
        milestones: [
          {
            name: "Foundation Setup",
            timeframe: "Months 1-4",
            deliverables: products.map(p => `Deploy ${p.quantity} units of ${p.product}`),
            approach: `Initiate setup to address ${itChallenges}, supporting ${businessGoals}.`,
            risks: ['Deployment delays', 'Resource constraints'],
            kpis: ['90% system uptime', 'Complete initial setup in 3 months', '50% reduction in outage incidents'],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Assess ${p.product}`, timeline: "Week 1-2", effortHours: 10, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
              { task: `Configure ${p.product}`, timeline: "Week 3-4", effortHours: 15, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
              { task: `Train for ${p.product}`, timeline: "Week 5-6", effortHours: 10, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: p.product.includes('Helpdesk') ? 'Follow ITIL 4 for incident management' :
                         p.product.includes('M365') ? 'Implement Microsoft Zero Trust' :
                         p.product.includes('Cybersecurity') ? 'Adhere to NIST guidelines' :
                         `Ensure standard deployment for ${p.product}`
            })),
            summaryTable: products.flatMap(p => [
              { task: `Assess ${p.product}`, hours: 10, product: p.product },
              { task: `Configure ${p.product}`, hours: 15, product: p.product },
              { task: `Train for ${p.product}`, hours: 10, product: p.product }
            ])
          }
        ],
        nextSteps: `Review setup with ${clientName} within 2 weeks; procure necessary licenses within 1 month.`
      };
    }

    console.log('Validating roadmap structure');
    if (!roadmap.milestones || !Array.isArray(roadmap.milestones) || !roadmap.nextSteps) {
      console.error('Invalid roadmap structure:', roadmap);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid roadmap structure' })
      };
    }

    console.log('Returning successful response');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ roadmap })
    };
  } catch (error) {
    console.error('Function error:', error.message, error.stack);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Failed to generate roadmap: ${error.message}` })
    };
  }
};