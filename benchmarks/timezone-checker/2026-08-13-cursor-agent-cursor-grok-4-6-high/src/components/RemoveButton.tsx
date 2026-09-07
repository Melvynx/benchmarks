type Props = {
  cityName: string
  onRemove: () => void
}

export function RemoveButton({ cityName, onRemove }: Props) {
  return (
    <button
      type="button"
      className="remove-btn"
      onClick={onRemove}
      aria-label={`Remove ${cityName}`}
      title={`Remove ${cityName}`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M3.2 3.2l7.6 7.6M10.8 3.2l-7.6 7.6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
