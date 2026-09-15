//==============================================
// src/components/settings/ATRSettings.tsx
//==============================================

interface Props {
    onClose: () => void;

}

export default function ATRSettings({
    onClose
}: Props) {
    return (
        <div>
            ATR SETTINGS
            <br/>
            <button onClick={onClose}>
                Close
            </button>
        </div>
    );
}