
export const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('sk-SK', { 
    style: 'currency', 
    currency: 'EUR',
    maximumFractionDigits: 2 
  }).format(amount || 0);
};

export const formatDate = (dateStr: string) => {
  if(!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('sk-SK');
};

export const formatDateTime = (dateStr: string) => {
  if(!dateStr) return '-';
  return new Date(dateStr).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
};
