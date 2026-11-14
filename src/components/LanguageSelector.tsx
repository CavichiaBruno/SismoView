import { useTranslation } from 'react-i18next'
import { changeAppLanguage, type AppLanguage } from '../i18n'

type LanguageSelectorProps = {
  className?: string
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { i18n } = useTranslation()

  return (
    <label className={className ?? 'language-selector'}>
      <span className="language-selector__label">
        {i18n.language.startsWith('en') ? 'Language' : 'Idioma'}
      </span>
      <select
        aria-label={i18n.language.startsWith('en') ? 'Select language' : 'Elegir idioma'}
        value={i18n.language.startsWith('en') ? 'en' : 'es'}
        onChange={(event) => {
          const language = event.currentTarget.value
          if (language === 'en' || language === 'es') {
            void changeAppLanguage(language satisfies AppLanguage)
          }
        }}
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </label>
  )
}
