import { createClient } from '@supabase/supabase-js';

const run = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sstduefzeufwmltjzknc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGR1ZWZ6ZXVmd21sdGp6a25jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDgzMzc3MiwiZXhwIjoyMDk2NDA5NzcyfQ.L-VnRENszyx-qrn1pyFyl12SBodHQFnS51tFZmhmc8E'
    );
    
    const { data: order } = await supabase.from('orders').select('*').eq('order_code', 'MW-MSVMP55P-G4TB').single();
    if (!order) return console.log("Order not found");

    // Delete dummy item
    await supabase.from('order_items').delete().eq('order_id', order.id);
    
    // Insert correct items
    const itemsToInsert = [
      {
        order_id: order.id,
        perfume_id: null,
        size_id: null,
        perfume_name: 'Bibit: MYKONOS MONACO ROYALE',
        size_label: '2.1ml',
        quantity: 1,
        price: 4200,
        subtotal: 4200
      },
      {
        order_id: order.id,
        perfume_id: null,
        size_id: null,
        perfume_name: 'Bibit: MYKONOS BLAZE',
        size_label: '2.1ml',
        quantity: 1,
        price: 4200,
        subtotal: 4200
      },
      {
        order_id: order.id,
        perfume_id: null,
        size_id: null,
        perfume_name: 'Pelarut: Absolute',
        size_label: '1.8ml',
        quantity: 1,
        price: 0,
        subtotal: 0
      },
      {
        order_id: order.id,
        perfume_id: null,
        size_id: null,
        perfume_name: 'Botol: TOLA 6ML',
        size_label: '6ml',
        quantity: 1,
        price: 2000,
        subtotal: 2000
      }
    ];

    const { error } = await supabase.from('order_items').insert(itemsToInsert);
    console.log("Insert actual items:", error || "Success");
}

run();
