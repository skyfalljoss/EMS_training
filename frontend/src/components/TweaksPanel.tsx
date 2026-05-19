import type { ChangeEvent } from 'react'
import { useState } from 'react'

export default function TweaksPanel() {
  const [open, setOpen] = useState(false)

  function handleAccent(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    document.documentElement.style.setProperty('--primary', v)
    document.documentElement.style.setProperty('--primary-light', v + 'cc')
    document.documentElement.style.setProperty('--primary-glow', v + '2e')
  }

  function handleGlass(e: ChangeEvent<HTMLSelectElement>) {
    const opacity = e.target.value
    document.documentElement.style.setProperty('--glass-base-opacity', opacity)
    document.documentElement.style.setProperty(
      '--glass-bg',
      `linear-gradient(135deg, var(--glass-highlight) 0%, rgba(255,255,255,${opacity}) 25%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.2) 100%)`,
    )
  }

  function handleRadius(e: ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value + 'px'
    document.documentElement.style.setProperty('--glass-radius', v)
  }

  function handleBlur(e: ChangeEvent<HTMLSelectElement>) {
    document.documentElement.style.setProperty('--glass-blur', e.target.value + 'px')
  }

  return (
    <>
      <button className={`tweaks-toggle${open ? ' hidden' : ''}`} onClick={() => setOpen(true)}>✦</button>
      <div className={`tweaks${open ? ' open' : ''}`}>
        <div className="tweak-group">
          <label>Primary Color</label>
          <input type="color" id="accentPicker" defaultValue="#003A72" onChange={handleAccent} />
        </div>
        <div className="tweak-group">
          <label>Glass Opacity</label>
          <select defaultValue="0.15" onChange={handleGlass}>
            <option value="0.08">Light</option>
            <option value="0.15">Medium</option>
            <option value="0.25">Heavy</option>
          </select>
        </div>
        <div className="tweak-group">
          <label>Border Radius</label>
          <select defaultValue="24" onChange={handleRadius}>
            <option value="12">Sharp</option>
            <option value="24">Default</option>
            <option value="36">Rounded</option>
          </select>
        </div>
        <div className="tweak-group">
          <label>Blur Strength</label>
          <select defaultValue="40" onChange={handleBlur}>
            <option value="16">Subtle</option>
            <option value="40">Medium</option>
            <option value="64">Strong</option>
          </select>
        </div>
        <button className="pa-btn btn-full mt-8" onClick={() => setOpen(false)}>Close</button>
      </div>
    </>
  )
}
