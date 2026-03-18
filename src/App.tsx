import React, { useMemo, useState } from 'react'
import { PillBar, PillButton, SkeletonBar, TabBar, Timeline } from '@aixbt-agent/components'
import { useFetch } from './lib/useFetch'
import {  StrategicMap, type StrategicMapLocation, type StrategicMapRoute  } from '@aixbt-agent/components'
import { useIsMobile } from './lib/useIsMobile'
const C = {
  bg: 'var(--c-bg)', surface: 'var(--c-surface)', text: 'var(--c-text)', secondary: 'var(--c-secondary)',
  muted: 'var(--c-muted)', dim: 'var(--c-dim)', accent: 'var(--c-accent)',
  green: 'var(--c-green)', yellow: 'var(--c-yellow)', red: 'var(--c-red)',
  purple: 'var(--c-purple)', blue: 'var(--c-blue)',
}
const font = 'var(--font-sans)'

const MAP_IRAN = '#C4383A'
const MAP_US = '#1D9BF0'

// --- Data fetching ---

// --- Geo data ---

interface GeoActor {
  id: string
  lat: number
  lng: number
  label: string
  allegiance: string
  type: string
  radius?: number
}

const ACTOR_LOCATIONS: GeoActor[] = [
  { id: 'iran-gov', lat: 35.6892, lng: 51.389, label: 'Tehran', allegiance: 'iran-aligned', type: 'capital' },
  { id: 'irgc', lat: 32.65, lng: 51.67, label: 'IRGC HQ / Isfahan', allegiance: 'iran-aligned', type: 'military' },
  { id: 'quds-force', lat: 34.32, lng: 47.07, label: 'Quds Force / Kermanshah', allegiance: 'iran-aligned', type: 'military' },
  { id: 'bushehr', lat: 28.92, lng: 50.82, label: 'Bushehr Nuclear Plant', allegiance: 'iran-aligned', type: 'nuclear' },
  { id: 'natanz', lat: 33.72, lng: 51.73, label: 'Natanz Enrichment', allegiance: 'iran-aligned', type: 'nuclear' },
  { id: 'fordow', lat: 34.88, lng: 51.59, label: 'Fordow Enrichment', allegiance: 'iran-aligned', type: 'nuclear' },
  { id: 'kharg', lat: 29.23, lng: 50.32, label: 'Kharg Island Oil Terminal', allegiance: 'iran-aligned', type: 'energy' },
  { id: 'bandar-abbas', lat: 27.18, lng: 56.27, label: 'Bandar Abbas / IRGC Navy', allegiance: 'iran-aligned', type: 'naval' },
  { id: 'hormuz', lat: 26.56, lng: 56.25, label: 'Strait of Hormuz', allegiance: 'iran-aligned', type: 'chokepoint', radius: 14 },
  { id: 'us-centcom', lat: 25.31, lng: 51.43, label: 'CENTCOM / Al Udeid', allegiance: 'us-aligned', type: 'military' },
  { id: 'us-bahrain', lat: 26.23, lng: 50.59, label: 'US 5th Fleet / Bahrain', allegiance: 'us-aligned', type: 'naval' },
  { id: 'israel-idf', lat: 31.77, lng: 35.21, label: 'IDF / Jerusalem', allegiance: 'us-aligned', type: 'military' },
  { id: 'nevatim', lat: 31.21, lng: 34.93, label: 'Nevatim Air Base', allegiance: 'us-aligned', type: 'airbase' },
  { id: 'hezbollah', lat: 33.85, lng: 35.86, label: 'Hezbollah / Beirut', allegiance: 'iran-aligned', type: 'proxy' },
  { id: 'houthis', lat: 15.35, lng: 44.21, label: 'Ansar Allah / Sanaa', allegiance: 'iran-aligned', type: 'proxy' },
  { id: 'iraq-pmf', lat: 33.31, lng: 44.37, label: 'PMF / Baghdad', allegiance: 'iran-aligned', type: 'proxy' },
  { id: 'saudi-arabia', lat: 24.71, lng: 46.68, label: 'Riyadh', allegiance: 'us-aligned', type: 'state' },
  { id: 'uae', lat: 24.45, lng: 54.65, label: 'Abu Dhabi', allegiance: 'us-aligned', type: 'state' },
  { id: 'ras-tanura', lat: 26.64, lng: 50.16, label: 'Ras Tanura Oil', allegiance: 'us-aligned', type: 'energy' },
  { id: 'bab-el-mandeb', lat: 12.58, lng: 43.33, label: 'Bab el-Mandeb', allegiance: 'iran-aligned', type: 'chokepoint', radius: 12 },
  { id: 'diego-garcia', lat: -7.31, lng: 72.42, label: 'Diego Garcia (USAF)', allegiance: 'us-aligned', type: 'airbase' },
  { id: 'incirlik', lat: 37.0, lng: 35.43, label: 'Incirlik Air Base', allegiance: 'us-aligned', type: 'airbase' },
]

const SHIPPING_ROUTES: StrategicMapRoute[] = [
  {
    id: 'strait-of-hormuz',
    points: [
      { lat: 26.0, lng: 56.5 },
      { lat: 26.56, lng: 56.25 },
      { lat: 27.0, lng: 56.8 },
    ],
    color: 'rgba(29,155,240,0.25)',
    strokeWidth: 0.8,
    strokeDasharray: '3 3',
  },
  {
    id: 'red-sea',
    points: [
      { lat: 12.58, lng: 43.33 },
      { lat: 14.0, lng: 42.5 },
      { lat: 20.0, lng: 38.5 },
      { lat: 30.0, lng: 32.5 },
    ],
    color: 'rgba(29,155,240,0.25)',
    strokeWidth: 0.8,
    strokeDasharray: '3 3',
  },
  {
    id: 'cape-route',
    points: [
      { lat: 12.58, lng: 43.33 },
      { lat: 5.0, lng: 48.0 },
      { lat: -5.0, lng: 50.0 },
      { lat: -15.0, lng: 45.0 },
      { lat: -34.0, lng: 25.0 },
    ],
    color: 'rgba(83,100,113,0.25)',
    strokeWidth: 0.6,
    strokeDasharray: '6 4',
  },
]

function actorColor(allegiance: string): string {
  if (allegiance.includes('iran')) return MAP_IRAN
  if (allegiance.includes('us')) return MAP_US
  return C.yellow
}


const MAP_LOCATIONS: StrategicMapLocation[] = ACTOR_LOCATIONS.map(location => ({
  id: location.id,
  lat: location.lat,
  lng: location.lng,
  label: location.label,
  color: actorColor(location.allegiance),
  radius: location.radius,
}))

// --- Interfaces ---
interface TimelineEvent { id: number; event_time: string; category: string; headline: string; details: string; severity: string; created_at: string }
interface BriefingRow { id: number; summary: string; key_developments: string[] | string; threat_level: string; updated_at: string }
interface TradeRow { id: string; direction: string; asset: string; entry: string; target: string; stop: string; timeframe: string; thesis: string; catalyst: string; confidence: string; status: string; updated_at: string; scenario_id?: string }
interface ActorRow { id: string; name: string; type: string; allegiance: string; capabilities: string; recent_activity: string; threat_rating: string; updated_at: string }

interface ScenarioRow { id: string; title: string; probability: string; description: string; market_impact: string; triggers: string; updated_at: string; trade_ids?: string[] }


const probOrder: Record<string, number> = { high: 0, 'moderate-high': 1, elevated: 2, moderate: 3, 'low-moderate': 4, low: 5, 'very low': 6 }

function probColor(level: string): string {
  const l = level?.toLowerCase()
  if (l === 'high' || l === 'moderate-high') return C.red
  if (l === 'elevated' || l === 'moderate' || l === 'low-moderate') return C.yellow
  return C.muted
}

// --- Skeleton loading ---

const skeletonPulse = `
@keyframes skeleton-pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 0.8 } }
@media (max-width: 500px) { .globe-detail-panel { width: 100% !important; } }
`

// --- Map Tab ---

function MapTab({ actors }: { actors: ActorRow[] | null }) {
  const isMobile = useIsMobile()
  const [selectedActor, setSelectedActor] = useState<string | null>(null)
  const actorMap = useMemo(() => new Map((actors || []).map(a => [a.id, a])), [actors])
  const toggleActor = (actorId: string | null) => {
    if (!actorId || actorId === selectedActor) {
      setSelectedActor(null)
      return
    }
    setSelectedActor(actorId)
  }

  const selectedData = selectedActor ? actorMap.get(selectedActor) : null
  const selectedGeo = selectedActor ? ACTOR_LOCATIONS.find(a => a.id === selectedActor) : null
  const tooltipPrimary = selectedData?.recent_activity
    || (selectedGeo?.type === 'chokepoint'
      ? 'Strategic chokepoint monitoring critical maritime transit.'
      : selectedGeo?.type === 'nuclear'
        ? 'Nuclear facility under international monitoring.'
        : selectedGeo?.type === 'energy'
          ? 'Strategic energy infrastructure node.'
          : '')
  const tooltipSecondary = selectedData?.capabilities || ''

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}>
        <StrategicMap
          locations={MAP_LOCATIONS}
          routes={SHIPPING_ROUTES}
          selectedId={selectedActor}
          onSelect={toggleActor}
          onClearSelection={() => setSelectedActor(null)}
          center={[44, 21]}
          zoom={isMobile ? 3.0 : 2.4}
          selectedZoom={isMobile ? 3.4 : 2.8}
          markerSize={1}
          selectedTooltip={selectedGeo && (
            <div
              style={{
                background: 'rgba(0,0,0,0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '12px 14px',
                color: '#fff',
                fontFamily: font,
                boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minHeight: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: selectedGeo.allegiance.includes('iran') ? MAP_IRAN : MAP_US,
                  flexShrink: 0,
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#fff', lineHeight: 1.25 }}>
                    {selectedGeo.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                    {selectedGeo.type} · {selectedGeo.allegiance.includes('iran') ? 'iran-aligned' : 'us-aligned'}
                  </div>
                </div>
              </div>

              {tooltipPrimary && (
                <div style={{ fontSize: 'var(--fs-sm)', color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>
                  {tooltipPrimary}
                </div>
              )}

              {tooltipSecondary && (
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.44)',
                  lineHeight: 1.45,
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {tooltipSecondary}
                </div>
              )}
            </div>
          )}
        />
      </div>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        padding: '10px 12px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <PillBar>
            {ACTOR_LOCATIONS.map(location => (
              <PillButton
                key={location.id}
                label={location.label}
                active={selectedActor === location.id}
                onClick={() => toggleActor(location.id)}
              />
            ))}
          </PillBar>
        </div>
      </div>

    </div>
  )
}

// --- Tab content components ---

function TimelineTab({ briefing }: { briefing: BriefingRow | null }) {
  const { data } = useFetch<TimelineEvent[]>('/api/data/timeline_events?limit=500&order_by=event_time&order=desc')

  const events = (data || []).map(e => ({
    id: e.id,
    time: e.event_time,
    category: e.category,
    headline: e.headline,
    details: e.details,
    important: e.severity === 'high' || e.severity === 'critical',
  }))

  return (
    <Timeline events={events} loading={!data?.length} />
  )
}

// --- Playbook helpers ---

function tradesForScenario(scenario: ScenarioRow, trades: TradeRow[]): TradeRow[] {
  // scenario_id match takes priority
  const byScenario = trades.filter(t => t.scenario_id === scenario.id)
  if (byScenario.length > 0) return byScenario
  // Explicit trade_ids fallback
  if (scenario.trade_ids?.length) {
    const idSet = new Set(scenario.trade_ids)
    const matched = trades.filter(t => idSet.has(t.id))
    if (matched.length > 0) return matched
  }
  return []
}

function splitTriggers(triggers: string | null | undefined): string[] {
  return (triggers || '')
    .split(/,\s*/)
    .map(item => item.trim())
    .filter(Boolean)
}

// --- Playbook Tab ---

function PlaybookTab() {
  const { data: scenarios } = useFetch<ScenarioRow[]>('/api/data/scenarios')
  const { data: trades } = useFetch<TradeRow[]>('/api/data/trade_ideas')
  const isMobile = useIsMobile()
  const activeTrades = useMemo(() => (trades || []).filter(t => t.status === 'active'), [trades])
  const sortedScenarios = useMemo(() =>
    [...(scenarios || [])].sort((a, b) => (probOrder[a.probability?.toLowerCase()] ?? 9) - (probOrder[b.probability?.toLowerCase()] ?? 9)),
    [scenarios]
  )
  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--fs-xs)',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: 'var(--font-mono)',
  }
  const valueStyle: React.CSSProperties = {
    fontSize: 'var(--fs-sm)',
    color: C.text,
    lineHeight: 1.5,
    fontFamily: 'var(--font-mono)',
  }

  if (!scenarios?.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              padding: `${isMobile ? 18 : 22}px ${isMobile ? 4 : 8}px ${isMobile ? 22 : 28}px`,
              borderTop: `2px solid ${C.dim}`,
            }}
          >
            <SkeletonBar width={108} height={10} style={{ marginBottom: 14 }} />
            <SkeletonBar width="58%" height={20} style={{ marginBottom: 10 }} />
            <SkeletonBar width="92%" height={12} style={{ marginBottom: 6 }} />
            <SkeletonBar width="80%" height={12} style={{ marginBottom: 18 }} />
            <SkeletonBar width={92} height={10} style={{ marginBottom: 12 }} />
            <SkeletonBar width="100%" height={48} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {sortedScenarios.map((s, i) => {
        const scenarioTrades = tradesForScenario(s, activeTrades)
        const probabilityColor = probColor(s.probability)
        const triggerItems = splitTriggers(s.triggers)

        return (
          <section
            key={s.id}
            style={{
              padding: `${isMobile ? 18 : 22}px ${isMobile ? 4 : 8}px ${isMobile ? 22 : 28}px`,
              borderTop: i === 0 ? 'none' : `1px solid ${C.dim}`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: probabilityColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      ...labelStyle,
                      color: C.secondary,
                    }}
                  >
                    {s.probability} probability
                  </span>
                </div>
                <h2
                  style={{
                    color: C.text,
                    fontSize: isMobile ? '20px' : '22px',
                    fontWeight: 600,
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    maxWidth: 760,
                  }}
                >
                  {s.title}
                </h2>
              </div>

              <p style={{ color: C.secondary, fontSize: 'var(--fs-base)', lineHeight: 1.7, maxWidth: 760 }}>
                {s.description}
              </p>

              {scenarioTrades.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={labelStyle}>Positioning</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {scenarioTrades.map((t, tradeIndex) => {
                      const isLong = t.direction?.toLowerCase() === 'long'
                      return (
                        <div
                          key={t.id}
                          style={{
                            padding: `${tradeIndex === 0 ? 0 : 14}px 0 14px`,
                            borderTop: tradeIndex === 0 ? 'none' : `1px solid ${C.dim}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                            <span
                              style={{
                                fontSize: 'var(--fs-xs)',
                                color: isLong ? C.green : C.red,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                              }}
                            >
                              {isLong ? 'Long' : 'Short'}
                            </span>
                            <span style={{ color: C.text, fontSize: 'var(--fs-md)', fontWeight: 500, lineHeight: 1.35 }}>
                              {t.asset}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1.6fr) repeat(4, minmax(0, 1fr))',
                              gap: isMobile ? '12px 16px' : '14px 20px',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={labelStyle}>Entry</div>
                              <div style={{ ...valueStyle, wordBreak: 'break-word' }}>{t.entry || '--'}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={labelStyle}>Target</div>
                              <div style={valueStyle}>{t.target || '--'}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={labelStyle}>Stop</div>
                              <div style={valueStyle}>{t.stop || '--'}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={labelStyle}>Timeframe</div>
                              <div style={valueStyle}>{t.timeframe || '--'}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={labelStyle}>Confidence</div>
                              <div style={valueStyle}>{t.confidence || '--'}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {triggerItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={labelStyle}>Watch</div>
                  <div style={{ color: C.secondary, fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
                    {triggerItems.join(' \u00b7 ')}
                  </div>
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// --- Main app ---

type TabId = 'globe' | 'timeline' | 'playbook'

const TABS: { id: string; label: string }[] = [
  { id: 'globe', label: 'Map' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'playbook', label: 'Playbook' },
]

export default function App() {
  const { data: actors } = useFetch<ActorRow[]>('/api/data/actors')
  const { data: briefingData } = useFetch<BriefingRow[]>('/api/data/situation_briefing')
  const [activeTab, setActiveTab] = useState<TabId>('globe')
  const isMobile = useIsMobile()

  const briefing = briefingData?.[0] || null

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: font, background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <style>{skeletonPulse}</style>
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabId)} />

      {/* Content area */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'globe' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <MapTab actors={actors} />
          </div>
        )}

        {activeTab !== 'globe' && (
          <div style={{
            position: 'absolute', inset: 0, overflowY: 'auto',
            display: 'flex', justifyContent: 'center', background: C.bg,
          }}>
            <div style={{
              width: '100%',
              maxWidth: 900,
              padding: isMobile ? '16px 12px' : '24px 32px',
            }}>
              {activeTab === 'timeline' && <TimelineTab briefing={briefing} />}
              {activeTab === 'playbook' && <PlaybookTab />}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
