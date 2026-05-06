import { supabase } from './supabase'
import type { Zone, RiskType, ColorState, SimulationScenario } from './types'

let simulationInterval: number | null = null
let currentScenario: SimulationScenario = 'NORMAL'

const RISK_THRESHOLDS = {
  YELLOW: 60, // 60% capacity
  RED: 85,    // 85% capacity
}

// Generate a random reading for a zone based on the scenario
const generateReading = (zone: Zone, scenario: SimulationScenario) => {
  // Base density depends on capacity
  const basePercent = Math.random() * 0.4 + 0.1 // 10% to 50%
  let densityPercent = basePercent

  // Adjust density based on scenario
  switch (scenario) {
    case 'BUILDING':
      densityPercent = Math.min(1.0, basePercent + 0.3) // 40% to 80%
      break
    case 'SURGE':
      // Very high density
      densityPercent = Math.min(1.1, basePercent + 0.6) // 70% to 110%
      break
    case 'BOTTLENECK':
      densityPercent = Math.min(1.0, basePercent + 0.5) // 60% to 100%
      break
    case 'RECOVERY':
      densityPercent = Math.max(0, basePercent - 0.2) // 0% to 30%
      break
  }

  const density = zone.capacity * densityPercent
  const flow_rate = scenario === 'BOTTLENECK' ? Math.random() * 5 : Math.random() * 30 + 10 // Bottleneck = low flow
  
  // Calculate Risk
  let color_state: ColorState = 'GREEN'
  let risk_score = Math.round(densityPercent * 100)
  let risk_type: RiskType = 'NORMAL'

  if (densityPercent * 100 >= RISK_THRESHOLDS.RED) {
    color_state = 'RED'
    if (scenario === 'SURGE') {
      risk_type = 'SURGE'
      risk_score = Math.min(100, risk_score + 10)
    } else if (scenario === 'BOTTLENECK') {
      risk_type = 'BOTTLENECK'
    } else {
      risk_type = 'STAMPEDE_RISK'
    }
  } else if (densityPercent * 100 >= RISK_THRESHOLDS.YELLOW) {
    color_state = 'YELLOW'
    risk_type = 'SLOW_BUILD'
  }

  return {
    zone_id: zone.id,
    event_id: zone.event_id,
    density,
    flow_rate,
    risk_score,
    risk_type,
    confidence: 'HIGH',
    color_state,
  }
}

export const Simulator = {
  start: async (eventId: string, scenario: SimulationScenario = 'NORMAL') => {
    if (simulationInterval) Simulator.stop()
    
    currentScenario = scenario

    // Fetch zones
    const { data: zones } = await supabase.from('zones').select('*').eq('event_id', eventId)
    if (!zones || zones.length === 0) return

    // Every 5 seconds insert new readings
    simulationInterval = window.setInterval(async () => {
      const readings = zones.map(z => generateReading(z, currentScenario))
      
      await supabase.from('zone_readings').insert(readings)

      // Maybe generate alert
      for (const r of readings) {
        if (r.color_state === 'RED' && Math.random() > 0.5) {
          await supabase.from('alerts').insert({
            event_id: eventId,
            zone_id: r.zone_id,
            risk_type: r.risk_type,
            risk_score: r.risk_score,
            priority: r.risk_type === 'STAMPEDE_RISK' ? 'CRITICAL' : 'HIGH',
            message: `Detected ${r.risk_type} in Zone. Immediate attention required.`,
            recommended_action: 'Dispatch stewards and open overflow gates immediately.',
            status: 'TRIGGERED'
          })
        }
      }
    }, 3000)

    console.log(`Simulation started for event ${eventId} [${scenario}]`)
  },

  stop: () => {
    if (simulationInterval) {
      clearInterval(simulationInterval)
      simulationInterval = null
      console.log('Simulation stopped')
    }
  },

  setScenario: (scenario: SimulationScenario) => {
    currentScenario = scenario
    console.log(`Scenario changed to ${scenario}`)
  }
}
