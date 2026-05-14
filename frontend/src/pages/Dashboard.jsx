import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card glass-card"><div className="kpi-label">Total Employees</div><div className="kpi-value">1,247</div><div className="kpi-trend up">↑ 3.2% <span className="kpi-sub">vs last quarter</span></div></div>
        <div className="kpi-card glass-card"><div className="kpi-label">Active Now</div><div className="kpi-value">1,023</div><div className="kpi-trend up">↑ 1.8% <span className="kpi-sub">vs last month</span></div></div>
        <div className="kpi-card glass-card"><div className="kpi-label">On Leave</div><div className="kpi-value">84</div><div className="kpi-trend down">↑ 6.3% <span className="kpi-sub">seasonal uptick</span></div></div>
        <div className="kpi-card glass-card"><div className="kpi-label">Open Positions</div><div className="kpi-value">37</div><div className="kpi-trend up">↑ 12 <span className="kpi-sub">new this month</span></div></div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card chart-card">
          <div className="card-header"><h2>Department Headcount</h2><span className="action">View all →</span></div>
          <div className="chart-bars">
            <div className="chart-bar-group"><div className="chart-bar" style={{height:'78%'}}></div><div className="chart-label">Retail</div></div>
            <div className="chart-bar-group"><div className="chart-bar" style={{height:'52%'}}></div><div className="chart-label">Corp</div></div>
            <div className="chart-bar-group"><div className="chart-bar" style={{height:'35%'}}></div><div className="chart-label">Risk</div></div>
            <div className="chart-bar-group"><div className="chart-bar" style={{height:'62%'}}></div><div className="chart-label">IT</div></div>
            <div className="chart-bar-group"><div className="chart-bar" style={{height:'28%'}}></div><div className="chart-label">Ops</div></div>
            <div className="chart-bar-group"><div className="chart-bar" style={{height:'45%'}}></div><div className="chart-label">Wealth</div></div>
            <div className="chart-bar-group"><div className="chart-bar" style={{height:'22%'}}></div><div className="chart-label">HR</div></div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header"><h2>Recent Activity</h2><span className="action">See all</span></div>
          <div className="activity-item"><div className="activity-dot" style={{background:'var(--success)'}}></div><div className="activity-body"><div className="activity-text"><strong>Sarah Chen</strong> joined Retail Banking as SVP</div><div className="activity-time">Today, 9:42 AM</div></div></div>
          <div className="activity-item"><div className="activity-dot" style={{background:'var(--warn)'}}></div><div className="activity-body"><div className="activity-text"><strong>L. Thompson</strong> submitted leave request (Mar 10–14)</div><div className="activity-time">Today, 8:15 AM</div></div></div>
          <div className="activity-item"><div className="activity-dot" style={{background:'var(--arc)'}}></div><div className="activity-body"><div className="activity-text"><strong>Payroll #0246</strong> processed — $8.4M disbursed</div><div className="activity-time">Yesterday, 6:00 PM</div></div></div>
          <div className="activity-item"><div className="activity-dot" style={{background:'var(--success)'}}></div><div className="activity-body"><div className="activity-text"><strong>IT Security</strong> completed Q1 audit — 0 critical findings</div><div className="activity-time">Yesterday, 3:30 PM</div></div></div>
          <div className="activity-item"><div className="activity-dot" style={{background:'var(--warn)'}}></div><div className="activity-body"><div className="activity-text"><strong>3 positions</strong> opened in Wealth Management</div><div className="activity-time">Mar 10, 11:20 AM</div></div></div>
        </div>

        <div className="glass-card">
          <div className="card-header"><h2>Quick Actions</h2></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:12,borderRadius:'var(--radius-sm)',background:'var(--primary-glass)',cursor:'pointer',transition:'all var(--transition)'}} onClick={() => navigate('/employees')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              <span style={{fontSize:13,fontWeight:510}}>Add Employee</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:12,borderRadius:'var(--radius-sm)',background:'var(--primary-glass)',cursor:'pointer',transition:'all var(--transition)'}} onClick={() => navigate('/leave')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
              <span style={{fontSize:13,fontWeight:510}}>Approve Leave</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:12,borderRadius:'var(--radius-sm)',background:'var(--primary-glass)',cursor:'pointer',transition:'all var(--transition)'}} onClick={() => navigate('/payroll')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
              <span style={{fontSize:13,fontWeight:510}}>Run Payroll</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:12,borderRadius:'var(--radius-sm)',background:'var(--primary-glass)',cursor:'pointer',transition:'all var(--transition)'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
              <span style={{fontSize:13,fontWeight:510}}>Generate Report</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
