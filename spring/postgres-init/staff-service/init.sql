
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

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.staffs (
    id bigint NOT NULL,
    full_name character varying(255) NOT NULL,
    phone character varying(255),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    email character varying(255)
);


CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNED BY public.staffs.id;

ALTER TABLE ONLY public.staffs ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


COPY public.staffs (id, full_name, phone, metadata, created_at, updated_at, email) FROM stdin;
22	staff user1		\N	2025-09-26 16:33:26.949343+07	2025-09-26 16:33:26.949343+07	user1@gmail.com
3	adfasdu	1234512344	\N	2025-09-23 23:44:11.068711+07	2025-10-22 21:20:47.920909+07	test@email12.com
36		0441241870	\N	2025-10-28 22:29:55.774979+07	2025-10-28 22:29:55.774979+07	dangquochuy26122003@gmail.com
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: huy
--

SELECT pg_catalog.setval('public.users_id_seq', 36, true);

ALTER TABLE ONLY public.staffs
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

