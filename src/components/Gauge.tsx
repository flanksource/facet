import { arc } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { FC, memo, ReactNode } from 'react';

export interface GaugeProps {
  value: number;
  units?: string;
  minValue: number;
  maxValue: number;
  width?: string;
  arcColor?: string;
  arcBgColor?: string;
  label?: ReactNode;
  showMinMax?: boolean;
}

export const Gauge: FC<GaugeProps> = memo(
  ({
    value,
    minValue,
    maxValue,
    units = '',
    arcColor = 'green',
    arcBgColor = '#d4d4d4',
    width = '12em',
    label,
    showMinMax = true
  }) => {
    const backgroundArc = arc()({
      innerRadius: 0.7,
      outerRadius: 1,
      startAngle: -Math.PI / 2,
      endAngle: Math.PI / 2
    });

    const filledPercent = scaleLinear().domain([minValue, maxValue])(value);
    const filledAngle = scaleLinear()
      .domain([0, 1])
      .range([-Math.PI / 2, Math.PI / 2])
      .clamp(true)(filledPercent);

    const filledArc = arc()({
      innerRadius: 0.7,
      outerRadius: 1,
      startAngle: -Math.PI / 2,
      endAngle: filledAngle
    });

    return (
      <div className="m-2 inline-block">
        <div className="relative" style={{ width }}>
          <svg viewBox="-1 -1 2 1" width="100%">
            <path d={backgroundArc || ''} fill={arcBgColor} />
            <path d={filledArc || ''} fill={arcColor} />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center">
            {label || (
              <span className="text-lg font-semibold">
                {value}{units}
              </span>
            )}
          </div>
        </div>
        {showMinMax && (
          <div className="flex justify-between items-center mt-1 px-1 text-xs text-gray-500 whitespace-nowrap">
            <span>{minValue}{units}</span>
            <span>{maxValue}{units}</span>
          </div>
        )}
      </div>
    );
  }
);

Gauge.displayName = 'Gauge';

export default Gauge;
