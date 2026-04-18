import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { VatReturn } from '@/types';
import { Language, translations } from '@/lib/translations';

interface VatTrendChartProps {
  data: VatReturn[];
  lang: Language;
}

export function VatTrendChart({ data, lang }: VatTrendChartProps) {
  const t = translations[lang];

  // Prepare data: Sort by month and summarize
  const chartData = [...data]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      name: item.month,
      sales: item.taxableSales - item.salesReturn,
      purchase: item.taxablePurchase - item.purchaseReturn,
      import: item.taxableImport,
    }));

  return (
    <div className="w-full h-[350px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748B', fontSize: 12 }} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={(value) => `Rs. ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ fontSize: '13px', fontWeight: '500' }}
            formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, '']}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line 
            type="monotone" 
            dataKey="sales" 
            name={t.taxableSales} 
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }} 
            activeDot={{ r: 6 }} 
          />
          <Line 
            type="monotone" 
            dataKey="purchase" 
            name={t.taxablePurchase} 
            stroke="#f59e0b" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }} 
            activeDot={{ r: 6 }} 
          />
          <Line 
            type="monotone" 
            dataKey="import" 
            name={t.taxableImport} 
            stroke="#f97316" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
