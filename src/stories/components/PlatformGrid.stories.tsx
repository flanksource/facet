import type { Meta, StoryObj } from '@storybook/react';
import PlatformGrid from '../../components/PlatformGrid';
import { Shield } from '../../components/Shield/Shield';
import { SiKubernetes, SiTerraform, SiGrafana } from 'react-icons/si';

const meta = {
  title: 'Components/PlatformGrid',
  component: PlatformGrid,
  tags: ['autodocs'],
} satisfies Meta<typeof PlatformGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      {
        name: 'Kubernetes',
        subtitle: 'Container orchestration and workload management',
        icon: SiKubernetes,
        shields: (
          <div className="flex gap-1">
            <Shield label="version" value="1.28" theme="primary" size="h-4" />
            <Shield label="status" value="healthy" theme="success" size="h-4" />
          </div>
        ),
        githubUrl: 'https://github.com/kubernetes/kubernetes',
      },
      {
        name: 'Terraform',
        subtitle: 'Infrastructure as code for cloud provisioning',
        icon: SiTerraform,
        shields: (
          <div className="flex gap-1">
            <Shield label="version" value="1.6" theme="primary" size="h-4" />
          </div>
        ),
        githubUrl: 'https://github.com/hashicorp/terraform',
      },
      {
        name: 'Grafana',
        subtitle: 'Observability dashboards and alerting',
        icon: SiGrafana,
        shields: (
          <div className="flex gap-1">
            <Shield label="dashboards" value="24" theme="info" size="h-4" />
          </div>
        ),
      },
    ],
  },
};
