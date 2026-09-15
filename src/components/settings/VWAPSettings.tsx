//===========================================
// src\components\settings\VWAPSettings.tsx
//============================================

interface Props {
    onClose: () => void;
}

export default function VWAPSettings({
    onClose
}: Props) {

    return (
        <div>
            VWAP SETTINGS
            <br/>
            <button onClick={onClose}>
                Close
            </button>
        </div>
    );
}