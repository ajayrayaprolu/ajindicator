//=============================================
// src/components/settings/RSISettings.tsx
//=============================================

interface Props {
    onClose: () => void;

}

export default function RSISettings({
    onClose
}: Props) {

    return (
        <div>
            RSI SETTINGS
            <br/>
            <button onClick={onClose}>
                Close
            </button>
        </div>
    );
}