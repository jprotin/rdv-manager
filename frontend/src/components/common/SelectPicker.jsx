// Remplace les <select> natifs par une popup thémée
// Props :
//   label    — titre affiché en haut de la popup
//   value    — valeur sélectionnée
//   onChange — callback(value)
//   onClose  — fermer sans changer
//   options  — [{ value, label, description? }]

export default function SelectPicker({ label, value, onChange, onClose, options }) {
  const handleSelect = (val) => {
    onChange(val);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* En-tête */}
        <div className="bg-primary-500 text-white px-5 py-4 flex items-center justify-between">
          <span className="font-semibold">{label}</span>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:text-white/70 transition-colors"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Options */}
        <ul className="py-2">
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors
                    ${isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-ink-700 hover:bg-ink-50'
                    }`}
                >
                  <div>
                    <span className="font-medium text-sm">{opt.label}</span>
                    {opt.description && (
                      <p className="text-xs text-ink-400 mt-0.5">{opt.description}</p>
                    )}
                  </div>
                  {isActive && (
                    <svg className="w-5 h-5 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Annuler — mobile */}
        <div className="px-4 pb-5 pt-1">
          <button onClick={onClose} className="btn-secondary w-full text-sm">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
