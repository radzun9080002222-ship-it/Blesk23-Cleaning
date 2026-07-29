type ConsentCheckboxProps = {
  checked: boolean;
  error?: boolean;
  id: string;
  onChange: (checked: boolean) => void;
};

const ConsentCheckbox = ({ checked, error = false, id, onChange }: ConsentCheckboxProps) => {
  const errorId = `${id}-error`;

  return (
    <div>
      <label
        htmlFor={id}
        className={`flex items-start gap-2 rounded-lg text-left text-[11px] leading-snug ${
          error ? 'text-destructive' : 'text-muted-foreground'
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error || undefined}
          aria-describedby={error ? errorId : undefined}
          className={`mt-0.5 h-4 w-4 shrink-0 accent-primary ${
            error ? 'outline outline-2 outline-offset-2 outline-destructive/50' : ''
          }`}
        />
        <span>
          Даю отдельное согласие на{' '}
          <a href="/consent" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            обработку персональных данных
          </a>{' '}
          и ознакомлен(а) с{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            политикой конфиденциальности
          </a>
          .
        </span>
      </label>
      {error && (
        <p id={errorId} className="mt-1 text-[11px] text-destructive">
          Подтвердите согласие, чтобы отправить заявку.
        </p>
      )}
    </div>
  );
};

export default ConsentCheckbox;
