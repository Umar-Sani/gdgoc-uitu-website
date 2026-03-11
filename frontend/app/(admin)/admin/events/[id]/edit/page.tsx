'use client';

import { useParams } from 'next/navigation';
import EventForm from '../../_components/EventForm';

export default function EditEventPage() {
  const params = useParams();
  return <EventForm mode="edit" eventId={String(params.id)} />;
}