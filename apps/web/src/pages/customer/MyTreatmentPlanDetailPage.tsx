import { useParams } from 'react-router-dom';
import { MyTreatmentPlanDetailView } from '@/features/treatments';

export function MyTreatmentPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <MyTreatmentPlanDetailView planId={id ?? ''} />;
}
