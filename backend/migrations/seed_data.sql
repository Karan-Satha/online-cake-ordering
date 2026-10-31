--
-- PostgreSQL database dump
--

\restrict GWhXPccWgUKdM4boTxSnxRRLnj92ztg58TQXsJZdT8Rnx4VYi5Xqxu2iI0DKV4G

-- Dumped from database version 17.10 (Homebrew)
-- Dumped by pg_dump version 17.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, created_at) FROM stdin;
1	Wedding Cakes	wedding-cakes	2026-08-09 15:17:45.941524
2	Birthday Cakes	birthday-cakes	2026-08-09 15:17:45.941524
3	Celebration Cakes	celebration-cakes	2026-08-09 15:17:45.941524
4	Cheesecakes	cheesecakes	2026-08-09 15:17:45.941524
5	Cupcakes	cupcakes	2026-08-09 15:17:45.941524
6	Brownies	brownies	2026-08-09 15:17:45.941524
7	Cookies	cookies	2026-08-09 15:17:45.941524
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, price_in_pence, image, category_id, featured, stock_quantity, description, old_price_in_pence) FROM stdin;
8	Luxury Floral Wedding Cake	18999	1786290703566.webp	1	t	5	Three-tier wedding cake decorated with handcrafted sugar flowers.	21999
13	Chocolate Birthday Cake	3499	1786293812705.webp	2	t	15	Rich chocolate sponge layered with chocolate buttercream.	3999
14	Rainbow Birthday Cake	3999	1786293834024.webp	2	t	12	Colourful celebration cake perfect for birthdays.	4499
15	Vanilla Sprinkle Cake	2999	1786293859036.webp	2	f	18	Classic vanilla cake covered in rainbow sprinkles.	3499
16	Unicorn Birthday Cake	4999	1786293879561.webp	2	t	8	Magical unicorn-themed cake for childrens birthdays.	5499
17	Football Birthday Cake	4599	1786293899332.webp	2	f	10	Custom football-themed birthday cake.	4999
18	Anniversary Celebration Cake	5999	1786293924147.webp	3	t	8	Elegant cake created for anniversaries and milestones.	6499
19	Baby Shower Cake	6499	1786293951421.webp	3	t	7	Beautiful cake perfect for baby shower celebrations.	6999
20	Graduation Cake	5499	1786293975591.webp	3	f	10	Celebration cake designed for graduation events.	5999
21	Engagement Cake	6999	1786294018531.webp	3	t	6	Luxury engagement cake with handcrafted decorations.	7499
36	New York Cheesecake	2999	1786294287855.webp	4	t	20	Creamy baked cheesecake with biscuit base.	3499
37	Lotus Biscoff Cheesecake	3499	1786294319591.webp	4	t	15	Smooth cheesecake topped with Lotus Biscoff crumbs.	3999
38	Strawberry Cheesecake	3299	1786294349244.webp	4	f	18	Fresh strawberry cheesecake with fruit glaze.	3799
39	Chocolate Cheesecake	3599	1786294374489.webp	4	t	15	Rich chocolate cheesecake finished with ganache.	3999
40	Oreo Cheesecake	3699	1786294437610.webp	4	t	14	Creamy cheesecake loaded with Oreo cookies.	4199
44	Cookies & Cream Cupcake	399	1786294535752.webp	5	t	35	Cupcake topped with crushed cookies and cream frosting.	499
46	Classic Chocolate Brownie	299	1786294643511.webp	6	t	60	Fudgy chocolate brownie made with premium cocoa.	349
41	Angel Cupcake	299	1786295575326.webp	5	t	50	Light vanilla cupcake topped with fluffy buttercream.	399
42	Chocolate Dream Cupcake	349	1786295623768.webp	5	t	40	Chocolate cupcake with silky frosting.	449
43	Strawberry Swirl Cupcake	349	1786295664951.webp	5	f	45	Vanilla cupcake with strawberry filling.	399
24	Ivory Elegance Wedding Cake	17499	1786295936007.webp	1	t	4	Classic ivory wedding cake with delicate piping.	19999
25	Golden Romance Wedding Cake	24999	1786295968901.webp	1	f	3	Premium wedding cake finished with gold leaf details.	27999
26	Blush Rose Wedding Cake	19999	1786296001090.webp	1	t	4	Beautiful blush-toned wedding cake with floral accents.	22999
23	Luxury Floral Wedding Cake	18999	1786296041816.webp	1	t	5	Three-tier wedding cake decorated with handcrafted sugar flowers.	21999
22	Engagement Celebration Cake	5799	1786294158849.webp	3	f	8	A memorable cake for retirement celebrations.	6299
50	Chunky Chocolate Cookie	249	1786294735837.webp	7	t	80	Bakery-style cookie packed with chocolate chunks.	299
51	White Chocolate Cookie	249	1786295228306.webp	7	f	70	Soft cookie with creamy white chocolate pieces.	299
53	Double Chocolate Cookie	299	1786295278149.webp	7	t	60	Chocolate cookie packed with chocolate chips.	349
52	Oat Chocolate Cookie	249	1786295336250.webp	7	f	75	Fun colourful cookie covered in sprinkles.	299
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 7, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 53, true);


--
-- PostgreSQL database dump complete
--

\unrestrict GWhXPccWgUKdM4boTxSnxRRLnj92ztg58TQXsJZdT8Rnx4VYi5Xqxu2iI0DKV4G

