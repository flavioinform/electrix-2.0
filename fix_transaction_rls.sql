-- Update the "Workers see only expenses" policy to also allow them to see their own transactions of ANY type.

DROP POLICY IF EXISTS "Workers see only expenses" ON public.transactions;

CREATE POLICY "Workers see only expenses or own"
ON public.transactions FOR SELECT TO authenticated USING (
    -- Case 1: Role is worker AND type is expense (standard view)
    (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trabajador')
      AND type = 'gasto'
    )
    OR
    -- Case 2: User is the creator (allows seeing what they just inserted)
    (created_by = auth.uid())
    OR
    -- Case 3: Supervisor (Access all) - Retaining existing separate policy, but good to be safe.
    (
       EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor')
    )
);
