import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { changeAppLanguage, type AppLanguage } from '../i18n'

type LanguageSelectorProps = {
  className?: string
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { i18n } = useTranslation()
  const labelId = useId()
  const selectedLanguage = i18n.language.startsWith('en') ? 'en' : 'es'

  return (
    <div className={className ?? 'language-selector'}>
      <span className="language-selector__label" id={labelId}>
        {i18n.language.startsWith('en') ? 'Language' : 'Idioma'}
      </span>
      <div
        className="language-selector__options"
        role="group"
        aria-labelledby={labelId}
      >
        <button
          className="language-selector__option"
          type="button"
          aria-label="Español"
          aria-pressed={selectedLanguage === 'es'}
          onClick={() => void changeAppLanguage('es' satisfies AppLanguage)}
        >
          <span>ES</span>
        </button>
        <button
          className="language-selector__option"
          type="button"
          aria-label="English"
          aria-pressed={selectedLanguage === 'en'}
          onClick={() => void changeAppLanguage('en' satisfies AppLanguage)}
        >
          <span>EN</span>
        </button>
      </div>
    </div>
  )
}
