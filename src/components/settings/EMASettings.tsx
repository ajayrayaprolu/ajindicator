//===============================================
// src/components/settings/EMASettings.tsx
//===============================================

interface Props {
    onClose: () => void;

}

export default function EMASettings({
    onClose
}: Props) {

    return (
        <div>
            EMA SETTINGS
            <br/>
            <button
                onClick={onClose}
            >
                Close
            </button>
        </div>
    );
}