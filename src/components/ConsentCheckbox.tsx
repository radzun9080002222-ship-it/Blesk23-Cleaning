type ConsentCheckboxProps = {
  checked: boolean;
  id: string;
  onChange: (checked: boolean) => void;
};

const ConsentCheckbox = ({ checked, id, onChange }: ConsentCheckboxProps) => (
  <label htmlFor={id} className="flex items-start gap-2 text-left text-[11px] leading-snug text-muted-foreground">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      required
      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
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
);

export default ConsentCheckbox;
