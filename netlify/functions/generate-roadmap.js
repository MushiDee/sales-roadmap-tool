const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const corsOrigin = 'https://mushidee.github.io';
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };

  console.log('Function invoked:', { method: event.httpMethod, path: event.path, body: event.body });

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
    const data = JSON.parse(event.body);
    const { clientName, itChallenges, businessGoals, currentInfra, products } = data;

    if (!clientName || !itChallenges || !businessGoals || !currentInfra || !products || !Array.isArray(products)) {
      console.log('Invalid input data:', data);
      throw new Error('Invalid input data');
    }

    console.log('Constructing prompt');
    const prompt = `
      You are an expert IT consultant for a managed services provider specializing in IT support and Microsoft Cloud services. Create a 12-month IT roadmap with three milestones tailored to the client's needs, infrastructure, and selected products. For each product in each milestone, you MUST include:
      - A project plan with exactly 3 tasks (e.g., discovery, configuration, training), each with a timeline (e.g., Week 1-2), effort hours (e.g., 10 hours), associated product, and dependencies (e.g., licensing/hardware costs excluded).
      - A summary table listing each task, its hours, and associated product.
      - Response points detailing:
        - How the product addresses the client's IT challenges.
        - Its contribution to the client's business goals.
        - A deliverable tied to the product's quantity.
      - One industry best practice guideline for deploying and running the product (e.g., ITIL 4, NIST, Microsoft Zero Trust).
      Each milestone must include:
      - A unique name and timeframe (e.g., Months 1-4).
      - 3 deliverables, each referencing a product, its quantity, and any licensing/hardware exclusions.
      - An approach in clear, non-technical language, linking response points to challenges and goals.
      - 2 risks specific to the infrastructure or product deployment, including licensing/hardware risks.
      - 3 measurable KPIs tailored to the client's scale and product outcomes (e.g., "95% ticket resolution within 1 hour").
      For Managed remote Helpdesk, specify whether the default 8/5 service (8 hours/day, 5 days/week) or optional 24/7 add-on is assumed, based on client challenges (e.g., 24/7 for critical systems). Provide next steps that are actionable, specific, include a timeline (e.g., within 2 weeks), reference actions for each product (e.g., "Procure M365 licenses"), and clarify 8/5 vs. 24/7 for Managed remote Helpdesk. Use exact product names to avoid misspellings. The roadmap must be professional, client-centric, and jargon-free.

      Service Context:
      - Managed Vendors: Coordinates third-party vendor services (e.g., hardware, software) with quarterly reviews. No licensing or hardware costs included; managed via vendor agreements.
      - Managed remote Helpdesk: Provides remote IT support, defaulting to 8/5 coverage (8 hours/day, 5 days/week, 9 AM–5 PM local time) with an optional 24/7 add-on for critical systems. Uses ConnectWise for ticketing with SLA-backed response times (<1 hour for critical issues). Licensing costs for ticketing software are excluded and must be purchased separately.
      - Managed Onsite Support technician (in hours): Hourly on-site support for hardware/software issues with priority scheduling. No licensing or hardware costs typically required.
      - Managed M365 instance: Manages Microsoft 365 tenants, including user provisioning, security (e.g., MFA), and tools (e.g., Teams). M365 licenses are excluded and must be purchased separately.
      - Managed Local Area network service: Monitors LAN (e.g., switches, routers) for performance and security using Cisco Meraki. Hardware (e.g., routers) and licensing costs for monitoring tools are excluded and must be purchased separately.
      - Managed Servers: Manages physical/virtual servers with patching, backups, and 99.9% uptime. Server hardware and OS licenses (e.g., Windows Server) are excluded and must be purchased separately.
      - Managed Firewalls: Configures firewalls (e.g., Fortinet) with real-time intrusion detection. Firewall hardware and licensing costs are excluded and must be purchased separately.
      - Managed Azure IaaS service: Deploys Azure infrastructure (e.g., VMs) for scalability. Azure subscription costs and licenses are excluded and must be covered by the client.
      - Managed Cybersecurity & SOC service: 24/7 security monitoring and compliance (e.g., GDPR) via a Security Operations Center. Licensing costs for security tools (e.g., SIEM) are excluded and must be purchased separately.
      - Additional Products: Custom solutions tailored to client needs. Licensing or hardware dependencies, if any, are excluded unless specified and must be purchased separately.

      Client Information:
      - Client Name: ${clientName}
      - IT Challenges: ${itChallenges}
      - Business Goals (Next 12 Months): ${businessGoals}
      - Current Infrastructure: ${currentInfra}
      - Products and Quantities: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Example Milestone Structure:
      {
        "name": "Infrastructure Stabilization",
        "timeframe": "Months 1-4",
        "deliverables": ["Deploy 10 units of Managed remote Helpdesk (8/5), ticketing software license excluded"],
        "approach": "Implement rapid-response support to reduce outages using Managed remote Helpdesk.",
        "risks": ["Delays in procuring ticketing software license", "Staff training gaps"],
        "kpis": ["95% ticket resolution within 1 hour", "99.5% server uptime", "100% VPN uptime for remote access"],
        "productsUsed": ["Managed remote Helpdesk"],
        "projectPlan": [
          {"task": "Install ticketing system", "timeline": "Week 1-2", "effortHours": 20, "product": "Managed remote Helpdesk", "dependencies": "Ticketing software license excluded"},
          {"task": "Train 10 users", "timeline": "Week 3-4", "effortHours": 40, "product": "Managed remote Helpdesk", "dependencies": "None"},
          {"task": "Configure SLAs", "timeline": "Week 2-3", "effortHours": 15, "product": "Managed remote Helpdesk", "dependencies": "None"}
        ],
        "bestPractices": [{"product": "Managed remote Helpdesk", "guideline": "Follow ITIL 4 for incident management"}],
        "summaryTable": [
          {"task": "Install ticketing system", "hours": 20, "product": "Managed remote Helpdesk"},
          {"task": "Train 10 users", "hours": 40, "product": "Managed remote Helpdesk"},
          {"task": "Configure SLAs", "hours": 15, "product": "Managed remote Helpdesk"}
        ]
      }

      Return the response in JSON format with:
      - milestones: array of milestone objects (name, timeframe, deliverables, approach, risks, kpis, productsUsed, projectPlan: array of {task, timeline, effortHours, product, dependencies}, bestPractices: array of {product, guideline}, summaryTable: array of {task, hours, product})
      - nextSteps: string describing actionable next steps with timelines

      Ensure projectPlan and summaryTable are included for each milestone, or the response will be considered invalid.
    `;

    console.log('Calling xAI Grok API');
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          { role: 'system', content: 'You are an expert IT consultant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000, // Reduced to avoid timeout
        temperature: 0.7
      }),
      timeout: 8000 // 8-second timeout to avoid Netlify limit
    }).catch(err => {
      console.error('API fetch error:', err.message);
      throw err;
    });

    console.log('Received API response:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API request failed:', response.status, errorText);
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Grok API request failed: ${errorText}` })
      };
    }

    const apiResponse = await response.json();
    console.log('Raw Grok API response:', JSON.stringify(apiResponse, null, 2));

    let roadmap;
    try {
      console.log('Parsing API response');
      if (!apiResponse.choices || !apiResponse.choices[0]?.message?.content) {
        throw new Error('No valid content in API response');
      }
      roadmap = JSON.parse(apiResponse.choices[0].message.content);
      console.log('Parsed roadmap:', JSON.stringify(roadmap, null, 2));
      // Validate projectPlan and summaryTable
      if (!roadmap.milestones.every(m => m.projectPlan && Array.isArray(m.projectPlan) && m.projectPlan.length === 3 * m.productsUsed.length && m.summaryTable && Array.isArray(m.summaryTable) && m.summaryTable.length === 3 * m.productsUsed.length)) {
        console.error('Missing projectPlan or summaryTable');
        throw new Error('Missing or incomplete projectPlan or summaryTable in API response');
      }
      console.log('Project plans included:', roadmap.milestones.every(m => m.projectPlan && Array.isArray(m.projectPlan) && m.projectPlan.length > 0));
      console.log('Summary tables included:', roadmap.milestones.every(m => m.summaryTable && Array.isArray(m.summaryTable) && m.summaryTable.length > 0));
    } catch (e) {
      console.error('Invalid JSON or incomplete response:', apiResponse.choices?.[0]?.message?.content || apiResponse, e.message);
      // Fallback roadmap
      roadmap = {
        milestones: [
          {
            name: 'Fallback Milestone',
            timeframe: 'Months 1-12',
            deliverables: [`Basic IT assessment using ${products.map(p => p.product).join(', ')}`],
            approach: `Conduct a review of ${clientName}'s infrastructure to address ${itChallenges}.`,
            risks: ['Potential delays', 'Resource constraints'],
            kpis: ['Complete assessment within 1 month', 'Deploy products within 6 months'],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Assess ${p.product}`, timeline: 'Week 1-2', effortHours: 10, product: p.product, dependencies: p.product.includes('M365') || p.product.includes('Azure') || p.product.includes('Firewalls') || p.product.includes('Helpdesk') || p.product.includes('LAN') || p.product.includes('Servers') || p.product.includes('Cybersecurity') ? 'Licensing/hardware costs excluded' : 'None' },
              { task: `Configure ${p.product}`, timeline: 'Week 3-4', effortHours: 15, product: p.product, dependencies: p.product.includes('M365') || p.product.includes('Azure') || p.product.includes('Firewalls') || p.product.includes('Helpdesk') || p.product.includes('LAN') || p.product.includes('Servers') || p.product.includes('Cybersecurity') ? 'Licensing/hardware costs excluded' : 'None' },
              { task: `Train for ${p.product}`, timeline: 'Week 5-6', effortHours: 20, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: `Follow industry standards for ${p.product} deployment.`
            })),
            summaryTable: products.flatMap(p => [
              { task: `Assess ${p.product}`, hours: 10, product: p.product },
              { task: `Configure ${p.product}`, hours: 15, product: p.product },
              { task: `Train for ${p.product}`, hours: 20, product: p.product }
            ])
          }
        ],
        nextSteps: `Schedule a meeting with ${clientName} to discuss initial assessment within 2 weeks.`
      };
    }

    // Validate roadmap structure
    console.log('Validating roadmap structure');
    if (!roadmap.milestones || !Array.isArray(roadmap.milestones) || !roadmap.nextSteps) {
      console.error('Invalid roadmap structure:', JSON.stringify(roadmap, null, 2));
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid roadmap structure from API' })
      };
    }

    // Ensure required fields
    roadmap.milestones = roadmap.milestones.map(milestone => ({
      ...milestone,
      productsUsed: milestone.productsUsed && Array.isArray(milestone.productsUsed) ? milestone.productsUsed : products.map(p => p.product),
      projectPlan: milestone.projectPlan && Array.isArray(milestone.projectPlan) ? milestone.projectPlan : products.flatMap(p => [
        { task: `Assess ${p.product}`, timeline: 'Week 1-2', effortHours: 10, product: p.product, dependencies: p.product.includes('M365') || p.product.includes('Azure') || p.product.includes('Firewalls') || p.product.includes('Helpdesk') || p.product.includes('LAN') || p.product.includes('Servers') || p.product.includes('Cybersecurity') ? 'Licensing/hardware costs excluded' : 'None' },
        { task: `Configure ${p.product}`, timeline: 'Week 3-4', effortHours: 15, product: p.product, dependencies: p.product.includes('M365') || p.product.includes('Azure') || p.product.includes('Firewalls') || p.product.includes('Helpdesk') || p.product.includes('LAN') || p.product.includes('Servers') || p.product.includes('Cybersecurity') ? 'Licensing/hardware costs excluded' : 'None' },
        { task: `Train for ${p.product}`, timeline: 'Week 5-6', effortHours: 20, product: p.product, dependencies: 'None' }
      ]),
      bestPractices: milestone.bestPractices && Array.isArray(milestone.bestPractices) ? milestone.bestPractices : products.map(p => ({
        product: p.product,
        guideline: `Follow industry standards for ${p.product} deployment.`
      })),
      summaryTable: milestone.summaryTable && Array.isArray(milestone.summaryTable) ? milestone.summaryTable : products.flatMap(p => [
        { task: `Assess ${p.product}`, hours: 10, product: p.product },
        { task: `Configure ${p.product}`, hours: 15, product: p.product },
        { task: `Train for ${p.product}`, hours: 20, product: p.product }
      ])
    }));

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