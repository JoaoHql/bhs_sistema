import React, { useMemo } from 'react';
import { ComboSimulatorTemplate, buildMockComboSimulationData } from '../../templates/combo-simulator';

export const CombosSimulatorTab: React.FC = () => {
  const data = useMemo(() => buildMockComboSimulationData(), []);
  return <ComboSimulatorTemplate data={data} />;
};
