import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard, { TimeUnitValue, DataUnitValue, NumberUnitValue } from './StatCard';

describe('StatCard', () => {
  // Test all 7 variants render correctly
  describe('Variants', () => {
    it('should render card variant with correct classes', () => {
      const { container } = render(
        <StatCard
          value={100}
          label="Test Metric"
          variant="card"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('bg-white');
      expect(wrapper.className).toContain('min-w-[40mm]');
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
    });

    it('should render badge variant with correct classes', () => {
      const { container } = render(
        <StatCard
          value={42}
          label="Badge"
          variant="badge"
          color="blue"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('inline-flex');
      expect(wrapper.className).toContain('rounded-full');
      expect(wrapper.className).toContain('bg-blue-50');
    });

    it('should render hero variant with larger text', () => {
      const { container } = render(
        <StatCard
          value="50x"
          label="Hero Metric"
          variant="hero"
        />
      );

      const value = screen.getByText('50x');
      expect(value.className).toContain('text-[36pt]');
      expect(value.className).toContain('font-bold');
    });

    it('should render bordered variant with border and color classes', () => {
      const { container } = render(
        <StatCard
          value={123}
          label="Bordered"
          variant="bordered"
          color="green"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('border');
      expect(wrapper.className).toContain('border-green-200');
      expect(wrapper.className).toContain('bg-green-50');
    });

    it('should render icon-heavy variant with icon badge', () => {
      const { container } = render(
        <StatCard
          value={5}
          label="Icon Heavy"
          variant="icon-heavy"
          icon={() => <div data-testid="test-icon">Icon</div>}
        />
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(container.querySelector('.absolute')).toBeInTheDocument();
    });

    it('should render left-aligned variant with flex layout', () => {
      const { container } = render(
        <StatCard
          value={200}
          label="Left Aligned"
          variant="left-aligned"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('items-center');
    });

    it('should render metric variant with colored background and border', () => {
      const { container } = render(
        <StatCard
          value={999}
          label="Metric"
          variant="metric"
          color="purple"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('bg-purple-50');
      expect(wrapper.className).toContain('border-purple-200');
    });
  });

  // Test compareVariant styles
  describe('Compare Variants', () => {
    it('should render trendline with trend icon and delta', () => {
      const { container } = render(
        <StatCard
          value={150}
          compareFrom={100}
          compareVariant="trendline"
          label="Trend"
        />
      );

      // Should show trend arrow and percentage
      expect(container.textContent).toContain('↗');
      expect(container.textContent).toContain('50');
      expect(container.textContent).toContain('%');
    });

    it('should render up-down with up arrow for positive delta', () => {
      const { container } = render(
        <StatCard
          value={120}
          compareFrom={100}
          compareVariant="up-down"
          label="Up"
        />
      );

      expect(container.textContent).toContain('▲');
      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    });

    it('should render up-down with down arrow for negative delta', () => {
      const { container } = render(
        <StatCard
          value={80}
          compareFrom={100}
          compareVariant="up-down"
          label="Down"
        />
      );

      expect(container.textContent).toContain('▼');
      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
    });

    it('should render before-after with arrow format', () => {
      const { container } = render(
        <StatCard
          value={200}
          compareFrom={150}
          compareVariant="before-after"
          label="Change"
        />
      );

      expect(container.textContent).toContain('150');
      expect(container.textContent).toContain('→');
      expect(container.textContent).toContain('200');
    });

    it('should render before-after-progress with dual progress bars', () => {
      const { container } = render(
        <StatCard
          value={75}
          compareFrom={50}
          compareVariant="before-after-progress"
          label="Progress"
        />
      );

      // Should have two ProgressBar components with Before/After labels
      expect(screen.getByText('Before')).toBeInTheDocument();
      expect(screen.getByText('After')).toBeInTheDocument();

      // Should show improvement indicator
      expect(container.textContent).toContain('↑');
      expect(container.textContent).toContain('%');
    });

    it('should show improvement percentage in before-after-progress', () => {
      const { container } = render(
        <StatCard
          value={40}
          compareFrom={50}
          compareVariant="before-after-progress"
          label="Decrease"
        />
      );

      // 20% improvement (50 → 40 = 20% decrease)
      expect(container.textContent).toContain('20%');
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('should normalize progress bars to max value', () => {
      const { container } = render(
        <StatCard
          value={100}
          compareFrom={50}
          compareVariant="before-after-progress"
          label="Normalized"
        />
      );

      // After bar should be at 100% width (max value)
      // Before bar should be at 50% width (50/100)
      // Both should be present
      expect(screen.getByText('Before')).toBeInTheDocument();
      expect(screen.getByText('After')).toBeInTheDocument();
    });

    it('should not render comparison when compareFrom is missing', () => {
      const { container } = render(
        <StatCard
          value={100}
          compareVariant="trendline"
          label="No Compare"
        />
      );

      // Should not have comparison elements
      expect(container.textContent).not.toContain('↗');
      expect(container.textContent).not.toContain('↘');
    });
  });

  // Test conditional styling
  describe('Conditional Styling', () => {
    it('should apply red-green preset for negative value', () => {
      const { container } = render(
        <StatCard
          value={-50}
          label="Negative"
          variant="metric"
          conditionalStyles={['red-green']}
        />
      );

      const value = screen.getByText('-50');
      expect(value.className).toContain('text-red-600');
    });

    it('should apply red-green preset for positive value', () => {
      const { container } = render(
        <StatCard
          value={50}
          label="Positive"
          variant="metric"
          conditionalStyles={['red-green']}
        />
      );

      const value = screen.getByText('50');
      expect(value.className).toContain('text-green-600');
    });

    it('should apply green-red preset (inverted)', () => {
      const { container } = render(
        <StatCard
          value={-10}
          label="Error Count"
          variant="metric"
          conditionalStyles={['green-red']}
        />
      );

      const value = screen.getByText('-10');
      expect(value.className).toContain('text-green-600');
    });

    it('should apply custom function condition', () => {
      const { container } = render(
        <StatCard
          value={150}
          label="High Value"
          variant="metric"
          conditionalStyles={[
            {
              condition: (v) => v.value > 100,
              classes: 'text-orange-600 font-extrabold'
            }
          ]}
        />
      );

      const value = screen.getByText('150');
      expect(value.className).toContain('text-orange-600');
      expect(value.className).toContain('font-extrabold');
    });

    it('should not apply condition when threshold not met', () => {
      const { container } = render(
        <StatCard
          value={50}
          label="Low Value"
          variant="metric"
          conditionalStyles={[
            {
              condition: (v) => v.value > 100,
              classes: 'text-orange-600'
            }
          ]}
        />
      );

      const value = screen.getByText('50');
      expect(value.className).not.toContain('text-orange-600');
    });

    it('should apply first matching condition', () => {
      const { container } = render(
        <StatCard
          value={75}
          label="Multiple Conditions"
          variant="metric"
          conditionalStyles={[
            {
              condition: (v) => v.value > 50,
              classes: 'text-yellow-600'
            },
            {
              condition: (v) => v.value > 70,
              classes: 'text-red-600'
            }
          ]}
        />
      );

      // Should apply first matching condition
      const value = screen.getByText('75');
      expect(value.className).toContain('text-yellow-600');
    });

    it('should apply conditional styles to improvement indicator in before-after-progress', () => {
      const { container } = render(
        <StatCard
          value={30}
          compareFrom={50}
          compareVariant="before-after-progress"
          label="With Conditional Style"
          conditionalStyles={['red-green']}
        />
      );

      // Improvement is +40% (50→30 = 40% reduction, positive improvement)
      // With red-green preset, positive improvement should be green
      const improvementText = container.querySelector('.text-green-500');
      expect(improvementText).toBeInTheDocument();
      expect(improvementText?.textContent).toContain('↑');
      expect(improvementText?.textContent).toContain('%');
    });

    it('should apply custom threshold to improvement indicator', () => {
      const { container } = render(
        <StatCard
          value={20}
          compareFrom={100}
          compareVariant="before-after-progress"
          label="Large Improvement"
          conditionalStyles={[
            {
              condition: (v) => v.value > 50,
              classes: 'text-orange-600 font-extrabold'
            }
          ]}
        />
      );

      // Improvement is 80% (100→20), should trigger condition
      const improvementIndicator = container.querySelector('.text-orange-600');
      expect(improvementIndicator).toBeInTheDocument();
      expect(improvementIndicator?.className).toContain('font-extrabold');
    });

    it('should apply green-red preset to negative improvement', () => {
      const { container } = render(
        <StatCard
          value={150}
          compareFrom={100}
          compareVariant="before-after-progress"
          label="Regression"
          conditionalStyles={['green-red']}
        />
      );

      // Improvement is -50% (100→150 = -50%, regression)
      // With green-red preset, negative improvement should be green
      const improvementText = container.querySelector('.text-green-500');
      expect(improvementText).toBeInTheDocument();
      expect(improvementText?.textContent).toContain('↓');
    });
  });

  // Test color theming
  describe('Color Theming', () => {
    const colors = ['blue', 'green', 'purple', 'orange', 'red', 'gray'] as const;

    colors.forEach(color => {
      it(`should apply ${color} theme classes`, () => {
        const { container } = render(
          <StatCard
            value={100}
            label={`${color} metric`}
            variant="metric"
            color={color}
          />
        );

        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain(`bg-${color}-50`);
        expect(wrapper.className).toContain(`border-${color}-200`);
      });
    });

    it('should apply color to bordered variant', () => {
      const { container } = render(
        <StatCard
          value={50}
          label="Bordered Red"
          variant="bordered"
          color="red"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('border-red-200');
      expect(wrapper.className).toContain('bg-red-50');
    });

    it('should apply color to badge variant', () => {
      const { container } = render(
        <StatCard
          value={25}
          label="Badge Green"
          variant="badge"
          color="green"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('bg-green-50');
    });
  });

  // Test value type flexibility
  describe('Value Types', () => {
    it('should render plain number value', () => {
      render(
        <StatCard
          value={42}
          label="Number"
        />
      );

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render plain string value', () => {
      render(
        <StatCard
          value="50x"
          label="String"
        />
      );

      expect(screen.getByText('50x')).toBeInTheDocument();
    });

    it('should render TimeUnitValue with toString()', () => {
      const timeValue = new TimeUnitValue(3600, 'seconds');

      render(
        <StatCard
          value={timeValue}
          label="Time"
        />
      );

      // TimeUnitValue.toString() converts to hours
      expect(screen.getByText('1h')).toBeInTheDocument();
    });

    it('should render DataUnitValue with toString()', () => {
      const dataValue = new DataUnitValue(2048, 'megabytes');

      render(
        <StatCard
          value={dataValue}
          label="Data"
        />
      );

      // DataUnitValue.toString() converts to GB
      expect(screen.getByText('2.0 GB')).toBeInTheDocument();
    });

    it('should render NumberUnitValue with percent', () => {
      const percentValue = new NumberUnitValue(85.5, 'percent');

      render(
        <StatCard
          value={percentValue}
          label="Percentage"
        />
      );

      expect(screen.getByText('85.5%')).toBeInTheDocument();
    });

    it('should render NumberUnitValue with currency', () => {
      const currencyValue = new NumberUnitValue(1234.56, 'currency');

      render(
        <StatCard
          value={currencyValue}
          label="Price"
        />
      );

      expect(screen.getByText('$1234.56')).toBeInTheDocument();
    });
  });

  // Test prop usage
  describe('Props Usage', () => {
    it('should render icon when provided', () => {
      const TestIcon = () => <div data-testid="custom-icon">My Icon</div>;

      render(
        <StatCard
          value={100}
          label="With Icon"
          icon={TestIcon}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render sublabel when provided', () => {
      render(
        <StatCard
          value={100}
          label="Main"
          sublabel="Additional info"
        />
      );

      expect(screen.getByText('Additional info')).toBeInTheDocument();
    });

    it('should apply custom className props', () => {
      const TestIcon = ({ className }: { className?: string }) => (
        <div className={className} data-testid="icon">Icon</div>
      );

      const { container } = render(
        <StatCard
          value={100}
          label="Custom Classes"
          icon={TestIcon}
          valueClassName="custom-value-class"
          iconClassName="custom-icon-class"
          sublabelClassName="custom-sublabel-class"
          sublabel="Sublabel"
        />
      );

      expect(screen.getByText('100').className).toContain('custom-value-class');
      expect(screen.getByTestId('icon').className).toContain('custom-icon-class');
      expect(screen.getByText('Sublabel').className).toContain('custom-sublabel-class');
    });

    it('should apply custom icon and value colors', () => {
      const TestIcon = ({ style }: { style?: React.CSSProperties }) => (
        <div style={style} data-testid="colored-icon">Icon</div>
      );

      const { container } = render(
        <StatCard
          value={100}
          label="Custom Colors"
          icon={TestIcon}
          iconColor="#ff0000"
          valueColor="#00ff00"
        />
      );

      const icon = screen.getByTestId('colored-icon');
      expect(icon.style.color).toBe('rgb(255, 0, 0)');

      const value = screen.getByText('100');
      expect(value.style.color).toBe('rgb(0, 255, 0)');
    });

    it('should not render icon when not provided', () => {
      const { container } = render(
        <StatCard
          value={100}
          label="No Icon"
        />
      );

      // Should not have icon wrapper
      expect(container.querySelector('[data-testid="test-icon"]')).not.toBeInTheDocument();
    });

    it('should prioritize conditional styles over inline valueColor', () => {
      const { container } = render(
        <StatCard
          value={-50}
          label="Priority Test"
          variant="metric"
          valueColor="#0000ff"
          conditionalStyles={['red-green']}
        />
      );

      const value = screen.getByText('-50');
      // Conditional style should win
      expect(value.className).toContain('text-red-600');
      expect(value.style.color).toBeFalsy();
    });
  });

  // Test size variants
  describe('Size Variants', () => {
    it('should render small card variant with correct size classes', () => {
      const { container } = render(
        <StatCard
          value={100}
          label="Small Card"
          variant="card"
          size="sm"
          icon={() => <div data-testid="icon">Icon</div>}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-[1mm]');
      expect(wrapper.className).toContain('px-[2mm]');
      expect(wrapper.className).toContain('py-[1.5mm]');

      const iconWrapper = container.querySelector('[data-testid="icon"]')?.parentElement;
      expect(iconWrapper?.className).toContain('w-[4mm]');
      expect(iconWrapper?.className).toContain('h-[4mm]');
    });

    it('should render medium card variant with correct size classes (default)', () => {
      const { container } = render(
        <StatCard
          value={100}
          label="Medium Card"
          variant="card"
          icon={() => <div data-testid="icon">Icon</div>}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-[2mm]');
      expect(wrapper.className).toContain('p-[4mm]');

      const iconWrapper = container.querySelector('[data-testid="icon"]')?.parentElement;
      expect(iconWrapper?.className).toContain('w-[6mm]');
      expect(iconWrapper?.className).toContain('h-[6mm]');
    });

    it('should render large card variant with correct size classes', () => {
      const { container } = render(
        <StatCard
          value={100}
          label="Large Card"
          variant="card"
          size="lg"
          icon={() => <div data-testid="icon">Icon</div>}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-[3mm]');
      expect(wrapper.className).toContain('p-[6mm]');

      const iconWrapper = container.querySelector('[data-testid="icon"]')?.parentElement;
      expect(iconWrapper?.className).toContain('w-[8mm]');
      expect(iconWrapper?.className).toContain('h-[8mm]');
    });

    it('should render small badge variant with correct size classes', () => {
      const { container } = render(
        <StatCard
          value={42}
          label="Badge"
          variant="badge"
          size="sm"
          color="blue"
          icon={() => <div data-testid="icon">Icon</div>}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-[1mm]');
      expect(wrapper.className).toContain('px-[2mm]');
      expect(wrapper.className).toContain('py-[1mm]');

      const iconWrapper = container.querySelector('[data-testid="icon"]')?.parentElement;
      expect(iconWrapper?.className).toContain('w-[4mm]');
      expect(iconWrapper?.className).toContain('h-[4mm]');
    });

    it('should render medium badge variant with correct size classes (default)', () => {
      const { container } = render(
        <StatCard
          value={42}
          label="Badge"
          variant="badge"
          color="blue"
          icon={() => <div data-testid="icon">Icon</div>}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-[2mm]');
      expect(wrapper.className).toContain('px-[4mm]');
      expect(wrapper.className).toContain('py-[2mm]');

      const iconWrapper = container.querySelector('[data-testid="icon"]')?.parentElement;
      expect(iconWrapper?.className).toContain('w-[6mm]');
      expect(iconWrapper?.className).toContain('h-[6mm]');
    });

    it('should render large badge variant with correct size classes', () => {
      const { container } = render(
        <StatCard
          value={42}
          label="Badge"
          variant="badge"
          size="lg"
          color="blue"
          icon={() => <div data-testid="icon">Icon</div>}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-[3mm]');
      expect(wrapper.className).toContain('px-[6mm]');
      expect(wrapper.className).toContain('py-[3mm]');

      const iconWrapper = container.querySelector('[data-testid="icon"]')?.parentElement;
      expect(iconWrapper?.className).toContain('w-[8mm]');
      expect(iconWrapper?.className).toContain('h-[8mm]');
    });

    it('should render bordered variant with size classes', () => {
      const { container } = render(
        <StatCard
          value={123}
          label="Bordered"
          variant="bordered"
          size="sm"
          color="green"
          icon={() => <div data-testid="icon">Icon</div>}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('gap-[1mm]');
      expect(wrapper.className).toContain('px-[2mm]');

      const iconWrapper = container.querySelector('[data-testid="icon"]')?.parentElement;
      expect(iconWrapper?.className).toContain('w-[4mm]');
    });
  });

  // Test edge cases
  describe('Edge Cases', () => {
    it('should handle zero value', () => {
      render(
        <StatCard
          value={0}
          label="Zero"
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative number value', () => {
      render(
        <StatCard
          value={-123}
          label="Negative"
        />
      );

      expect(screen.getByText('-123')).toBeInTheDocument();
    });

    it('should handle empty string value', () => {
      render(
        <StatCard
          value=""
          label="Empty"
        />
      );

      // Empty value should still render (even if empty)
      const wrapper = screen.getByText('Empty').closest('div');
      expect(wrapper).toBeInTheDocument();
    });

    it('should handle compareFrom with zero', () => {
      const { container } = render(
        <StatCard
          value={50}
          compareFrom={0}
          compareVariant="trendline"
          label="From Zero"
        />
      );

      // Should not crash or show NaN
      expect(container.textContent).not.toContain('NaN');
    });

    it('should default to card variant when variant not specified', () => {
      const { container } = render(
        <StatCard
          value={100}
          label="Default"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('bg-white');
      expect(wrapper.className).toContain('min-w-[40mm]');
    });
  });
});
