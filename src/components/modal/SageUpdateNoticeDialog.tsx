import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetButton } from '../shared/Sheet';
import { useSageUpdateNoticeStore } from '../../stores/useSageUpdateNoticeStore';
import { useThemeSettingsStore } from '../../stores/useThemeSettingsStore';

// src/components/modal/SageUpdateNoticeDialog.tsx
// Sage 自建实例的强制更新弹窗：每次启动都出现，关不掉（无 X、点外部和 Esc 都无效），唯一的出口是点「前往更新」跳去下载新版本；点了之后本次启动不再挡，下次启动还会再出现。

const UPDATE_DOWNLOAD_URL = 'https://drive.uc.cn/s/26910d1ee8794?public=1';
const OPEN_DELAY_MS = 900;

type SageUpdateNoticeDialogProps = {
    /** 版本说明等启动弹窗打开时先让行，关闭后再显示更新弹窗。 */
    isStartupBlocked: boolean;
};

const SageUpdateNoticeDialog: React.FC<SageUpdateNoticeDialogProps> = ({ isStartupBlocked }) => {
    const { t } = useTranslation();
    const isDaylight = useThemeSettingsStore(state => state.isDaylight);
    const setUpdateNoticeOpen = useSageUpdateNoticeStore(state => state.setUpdateNoticeOpen);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen || isStartupBlocked) {
            return;
        }
        const timer = window.setTimeout(() => {
            setIsOpen(true);
            setUpdateNoticeOpen(true);
        }, OPEN_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [isOpen, isStartupBlocked, setUpdateNoticeOpen]);

    const goUpdate = () => {
        window.open(UPDATE_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
        setIsOpen(false);
        setUpdateNoticeOpen(false);
    };

    return (
        <Sheet
            isOpen={isOpen}
            onClose={goUpdate}
            isDaylight={isDaylight}
            size="m"
            title={t('sageUpdateNotice.title')}
            closeDisabled
            closeDisabledTip={t('sageUpdateNotice.button')}
            footer={<SheetButton variant="primary" onClick={goUpdate}>{t('sageUpdateNotice.button')}</SheetButton>}
        >
            <div data-testid="sage-update-notice-dialog">
                <p className="text-[13px] leading-[21px] text-[color:var(--st-t1)]">
                    {t('sageUpdateNotice.body')}
                </p>
            </div>
        </Sheet>
    );
};

export default SageUpdateNoticeDialog;
