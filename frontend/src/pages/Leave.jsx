import { useState } from 'react'
import { pendingLeaves, leaveBalances } from '../data/leaves'

export default function Leave() {
  const [leaves, setLeaves] = useState(pendingLeaves)

  function handleApprove(idx) {
    setLeaves(prev => prev.filter((_, i) => i !== idx))
  }

  function handleDecline(idx) {
    setLeaves(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="leave-layout">
      <div className="glass-card">
        <div className="card-header"><h2>Leave Balances</h2></div>
        <div className="leave-balances">
          {leaveBalances.map(lb => (
            <div key={lb.type} className="leave-type">
              <div className="type">{lb.type}</div>
              <div className="used">{lb.used} days used of {lb.total}</div>
              <div className="leave-bar"><div className="leave-bar-fill" style={{width:`${(lb.used/lb.total)*100}%`,background:lb.color}}></div></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="glass-card" style={{marginBottom:16}}>
          <div className="card-header"><h2>Pending Approvals</h2><span className="action">View all</span></div>
          {leaves.length === 0 ? (
            <div style={{padding:'12px 0',fontSize:13,color:'var(--muted)',textAlign:'center'}}>All caught up!</div>
          ) : (
            leaves.map((l, i) => (
              <div key={i} className="pending-approval">
                <div className="pa-info">
                  <div className="pa-name">{l.name}</div>
                  <div className="pa-detail">{l.dept} · {l.type} · {l.from}</div>
                </div>
                <div className="pa-actions">
                  <button className="pa-btn approve" onClick={() => handleApprove(i)}>Approve</button>
                  <button className="pa-btn decline" onClick={() => handleDecline(i)}>Decline</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="glass-card">
          <div className="card-header"><h2>Team Calendar</h2></div>
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:28,fontWeight:600,fontFamily:'var(--font-display)',letterSpacing:'-0.02em'}}>March 2026</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginTop:16,fontSize:11}}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} style={{color:'var(--muted)',padding:'6px 0'}}>{d}</div>
              ))}
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map((day, i) => (
                <div key={day} style={{
                  padding:'6px 0',
                  color: [3,25].includes(i) ? 'var(--primary)' : [9].includes(i) ? 'var(--warn)' : [0,6,13,20,27].includes(i) ? 'var(--muted)' : undefined,
                  fontWeight: [3,25].includes(i) ? 600 : [9].includes(i) ? 600 : undefined,
                  background: [3,25].includes(i) ? 'var(--primary-glass)' : [9].includes(i) ? 'oklch(72% 0.14 85 / 0.1)' : undefined,
                  borderRadius: [3,9,25].includes(i) ? 4 : undefined,
                }}>{day}</div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginTop:12,fontSize:11,justifyContent:'center'}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'var(--primary)'}}></span>On Leave</span>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'var(--warn)'}}></span>Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
